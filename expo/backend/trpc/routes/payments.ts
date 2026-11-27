import * as z from "zod";
import { adminProcedure, createTRPCRouter, isStaff, protectedProcedure, publicProcedure } from "../create-context";
import { store } from "../../store";
import { audit, fail } from "../helpers";
import { checkLock, clearFailures, recordFailure } from "../../security";
import { serverEnv } from "../../env";
import { smsConfigured } from "../../sms";
import {
  PAYSTACK_CURRENCIES,
  PaystackError,
  applyTransferResult,
  finalizePaid,
  fmtMoney,
  markPaymentFailed,
  newReceiptNumber,
  newReference,
  paystack,
  paystackConfigured,
} from "../../paystack";
import type { Payment, Payout, PayoutDestination, Property, User } from "../../../types/property";
import { countryOptions } from "../../../lib/countries";

const SYMBOL_TO_ISO: Record<string, string> = { $: "USD", US$: "USD" };

/** Listings store a currency symbol; Paystack wants the ISO code. */
function isoCurrency(property: Property): string {
  const raw = (property.currency ?? "").trim();
  if (/^[A-Z]{3}$/.test(raw)) return raw;
  const byCountry = countryOptions.find((c) => c.name === property.country);
  if (byCountry && (byCountry.symbol === raw || !raw)) return byCountry.currency;
  if (SYMBOL_TO_ISO[raw]) return SYMBOL_TO_ISO[raw];
  const bySymbol = countryOptions.filter((c) => c.symbol === raw);
  if (bySymbol.length >= 1) return bySymbol[0].currency;
  return raw.toUpperCase();
}

const destinationSchema = z.object({
  type: z.enum(["mobile_money", "bank"]),
  recipientType: z.string().trim().min(2).max(30),
  bankCode: z.string().trim().min(1).max(30),
  bankName: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(6, "Enter the full account / MoMo number").max(30).regex(/^[0-9+ ]+$/, "Numbers only"),
  accountName: z.string().trim().min(2, "Enter the account holder's name").max(120),
});

/** Allowed checkout return targets: https sites and the app's own schemes. */
function safeReturnUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    if (u.protocol === "https:" || /^(exp|exps|rork-app|perfectspace|myapp)[a-z0-9+.-]*:$/i.test(u.protocol)) return u.toString();
    if (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return u.toString();
  } catch {
    // invalid URL
  }
  return undefined;
}

/** What a viewer may see of a payment. Release codes stay with the renter. */
function view(p: Payment, user: User) {
  if (p.renterId === user.id || isStaff(user)) return p;
  const { releaseCode: _code, renterEmail: _email, ...rest } = p;
  return rest as Payment;
}

function feePercent() {
  const n = Number(serverEnv("PLATFORM_FEE_PERCENT") || 0);
  return Number.isFinite(n) && n >= 0 && n < 50 ? n : 0;
}

function toFail(e: unknown): never {
  if (e instanceof PaystackError) fail("BAD_REQUEST", e.message);
  throw e;
}

/** Create the recipient + transfer on Paystack. Throws a friendly error. */
async function sendPayout(payment: Payment, destination: PayoutDestination, releasedBy: Payout["releasedBy"], actor: User) {
  const pIdx = store.payments.findIndex((p) => p.id === payment.id);
  const amount = Math.round(payment.amount * (100 - feePercent())) / 100;
  const payout: Payout = {
    id: store.generateId("po"),
    paymentId: payment.id,
    propertyTitle: payment.propertyTitle,
    ownerId: payment.ownerId,
    ownerName: payment.ownerName,
    amount,
    currency: payment.currency,
    destination,
    status: "processing",
    reference: newReference("po"),
    receiptNumber: newReceiptNumber("PO"),
    releasedBy,
    createdAt: new Date().toISOString(),
  };
  // Lock first so a double-tap can't pay out twice.
  store.payments[pIdx] = { ...store.payments[pIdx], payoutStatus: "processing", payoutId: payout.id };
  store.payouts.unshift(payout);
  const oIdx = store.payouts.findIndex((p) => p.id === payout.id);

  try {
    const recipient = await paystack<{ recipient_code: string }>("/transferrecipient", {
      method: "POST",
      body: {
        type: destination.recipientType,
        name: destination.accountName,
        account_number: destination.accountNumber.replace(/\s+/g, ""),
        bank_code: destination.bankCode,
        currency: payment.currency,
      },
    });
    const transfer = await paystack<{ transfer_code: string; status: string }>("/transfer", {
      method: "POST",
      body: {
        source: "balance",
        amount: Math.round(amount * 100),
        recipient: recipient.recipient_code,
        reference: payout.reference,
        currency: payment.currency,
        reason: `Perfect Space payout — ${payment.propertyTitle}`.slice(0, 100),
      },
    });
    store.payouts[oIdx] = {
      ...store.payouts[oIdx],
      transferCode: transfer.transfer_code,
      failureReason:
        transfer.status === "otp" ? "Waiting for OTP approval in the Paystack dashboard (turn off transfer OTP to automate)." : undefined,
    };
    audit({ ip: undefined, user: actor }, `payout.${releasedBy}`, { targetType: "payout", targetId: payout.id, detail: fmtMoney(amount, payout.currency) });
    if (transfer.status === "success" || transfer.status === "failed" || transfer.status === "reversed") {
      applyTransferResult(payout.reference, transfer.status);
    }
    return store.payouts.find((p) => p.id === payout.id)!;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Transfer failed";
    store.payouts[oIdx] = { ...store.payouts[oIdx], status: "failed", failureReason: reason };
    store.payments[pIdx] = { ...store.payments[pIdx], payoutStatus: "locked", payoutId: undefined };
    toFail(e);
  }
}

const bankCache = new Map<string, { at: number; list: { name: string; code: string; type: string }[] }>();

export const paymentsRouter = createTRPCRouter({
  config: publicProcedure.query(() => ({
    paymentsEnabled: paystackConfigured(),
    smsEnabled: smsConfigured(),
    currencies: PAYSTACK_CURRENCIES,
    feePercent: feePercent(),
  })),

  initialize: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().max(64),
        quantity: z.number().int().min(1).max(36).default(1),
        returnUrl: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user;
      const property = store.properties.find((p) => p.id === input.propertyId);
      if (!property || property.status !== "active") fail("NOT_FOUND", "This property is not available.");
      if (property.ownerId === me.id) fail("BAD_REQUEST", "You can't pay for your own property.");
      if (property.occupancy === "booked") fail("CONFLICT", "This property has already been booked.");
      const currency = isoCurrency(property);
      if (!(PAYSTACK_CURRENCIES as readonly string[]).includes(currency)) {
        fail("BAD_REQUEST", `Online payment isn't available for ${currency} listings yet. Contact the landlord.`);
      }
      if (!paystackConfigured()) fail("PRECONDITION_FAILED", "Online payments aren't switched on yet. Please try again later.");
      if (!me.email) fail("BAD_REQUEST", "Add an email address to your profile to pay.");

      const quantity = property.listingType === "sale" ? 1 : Math.max(input.quantity, property.durationUnit === "night" ? property.minNights ?? 1 : 1);
      const amount = Math.round(property.price * quantity * 100) / 100;
      if (amount <= 0) fail("BAD_REQUEST", "This listing has no price set.");
      const owner = store.users.find((u) => u.id === property.ownerId);

      const payment: Payment = {
        id: store.generateId("pay"),
        reference: newReference("ps"),
        propertyId: property.id,
        propertyTitle: property.title,
        propertyImage: property.images[0] ?? "",
        renterId: me.id,
        renterName: me.name,
        renterEmail: me.email,
        ownerId: property.ownerId,
        ownerName: owner?.name ?? property.ownerName,
        amount,
        currency,
        quantity,
        unit: property.listingType === "sale" ? "purchase" : property.durationUnit ?? "month",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      store.payments.unshift(payment);

      const callback = safeReturnUrl(input.returnUrl);
      try {
        const data = await paystack<{ authorization_url: string; reference: string }>("/transaction/initialize", {
          method: "POST",
          body: {
            email: me.email,
            amount: Math.round(amount * 100),
            currency: payment.currency,
            reference: payment.reference,
            callback_url: callback ? `${callback}${callback.includes("?") ? "&" : "?"}ref=${payment.reference}` : undefined,
            metadata: {
              paymentId: payment.id,
              propertyId: property.id,
              renterId: me.id,
              custom_fields: [{ display_name: "Property", variable_name: "property", value: property.title.slice(0, 80) }],
            },
          },
        });
        audit(ctx, "payment.init", { targetType: "payment", targetId: payment.id, detail: fmtMoney(amount, payment.currency) });
        return { authorizationUrl: data.authorization_url, reference: payment.reference, paymentId: payment.id };
      } catch (e) {
        markPaymentFailed(payment.reference, "failed");
        toFail(e);
      }
    }),

  verify: protectedProcedure.input(z.object({ reference: z.string().max(80) })).mutation(async ({ input, ctx }) => {
    const p = store.payments.find((x) => x.reference === input.reference);
    if (!p || (p.renterId !== ctx.user.id && !isStaff(ctx.user))) fail("NOT_FOUND", "Payment not found");
    if (p.status !== "paid") {
      try {
        const tx = await paystack<{ status: string; amount: number; currency: string; channel: string; paid_at: string }>(
          `/transaction/verify/${encodeURIComponent(p.reference)}`
        );
        if (tx.status === "success") finalizePaid(p.reference, tx);
        else if (tx.status === "failed" || tx.status === "abandoned") markPaymentFailed(p.reference, tx.status);
      } catch (e) {
        toFail(e);
      }
    }
    return view(store.payments.find((x) => x.reference === input.reference)!, ctx.user);
  }),

  /** Your payments (as renter), money owed to you (as landlord) and your payouts. */
  mine: protectedProcedure.query(({ ctx }) => {
    const me = ctx.user;
    return {
      asRenter: store.payments.filter((p) => p.renterId === me.id && p.status !== "pending"),
      asOwner: store.payments.filter((p) => p.ownerId === me.id && p.status === "paid").map((p) => view(p, me)),
      payouts: store.payouts.filter((p) => p.ownerId === me.id),
      payoutAccount: store.users.find((u) => u.id === me.id)?.payoutAccount ?? null,
    };
  }),

  receipt: protectedProcedure.input(z.object({ id: z.string().max(80) })).query(({ input, ctx }) => {
    const me = ctx.user;
    const payment = store.payments.find((p) => p.id === input.id || p.receiptNumber === input.id);
    if (payment) {
      if (payment.renterId !== me.id && payment.ownerId !== me.id && !isStaff(me)) fail("NOT_FOUND", "Receipt not found");
      if (payment.status !== "paid") fail("NOT_FOUND", "This payment hasn't completed.");
      return { kind: "payment" as const, payment: view(payment, me) };
    }
    const payout = store.payouts.find((p) => p.id === input.id || p.receiptNumber === input.id);
    if (payout && (payout.ownerId === me.id || isStaff(me))) return { kind: "payout" as const, payout };
    fail("NOT_FOUND", "Receipt not found");
  }),

  banks: protectedProcedure
    .input(z.object({ currency: z.string().max(5), type: z.enum(["mobile_money", "bank"]) }))
    .query(async ({ input }) => {
      const key = input.currency.toUpperCase();
      let cached = bankCache.get(key);
      if (!cached || Date.now() - cached.at > 6 * 3_600_000) {
        try {
          const data = await paystack<{ name: string; code: string; type: string; active?: boolean }[]>(
            `/bank?currency=${encodeURIComponent(key)}&perPage=200`
          );
          cached = { at: Date.now(), list: data.filter((b) => b.active !== false).map((b) => ({ name: b.name, code: b.code, type: b.type })) };
          bankCache.set(key, cached);
        } catch (e) {
          toFail(e);
        }
      }
      return cached.list.filter((b) => (input.type === "mobile_money" ? b.type === "mobile_money" : b.type !== "mobile_money"));
    }),

  resolveAccount: protectedProcedure
    .input(z.object({ accountNumber: z.string().max(30), bankCode: z.string().max(30) }))
    .mutation(async ({ input }) => {
      try {
        const data = await paystack<{ account_name: string }>(
          `/bank/resolve?account_number=${encodeURIComponent(input.accountNumber)}&bank_code=${encodeURIComponent(input.bankCode)}`
        );
        return { accountName: data.account_name };
      } catch {
        return { accountName: null };
      }
    }),

  savePayoutAccount: protectedProcedure.input(z.object({ destination: destinationSchema })).mutation(({ input, ctx }) => {
    const idx = store.users.findIndex((u) => u.id === ctx.user.id);
    store.users[idx] = { ...store.users[idx], payoutAccount: input.destination };
    audit(ctx, "payout.account", { targetType: "user", targetId: ctx.user.id, detail: input.destination.bankName });
    return input.destination;
  }),

  /** Landlord enters the renter's release code to withdraw. */
  redeem: protectedProcedure
    .input(z.object({ code: z.string().trim().min(4).max(20), destination: destinationSchema }))
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user;
      const lockKey = `redeem:${me.id}`;
      const mins = checkLock(lockKey);
      if (mins) fail("TOO_MANY_REQUESTS", `Too many wrong codes. Try again in ${mins} minutes.`);
      const code = input.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const payment = store.payments.find(
        (p) => p.ownerId === me.id && p.status === "paid" && (p.releaseCode ?? "").replace("-", "") === code
      );
      if (!payment) {
        recordFailure(lockKey);
        audit(ctx, "payout.code", { success: false });
        fail("BAD_REQUEST", "That release code doesn't match any of your paid bookings.");
      }
      clearFailures(lockKey);
      if (payment.payoutStatus === "paid") fail("CONFLICT", "This payment has already been paid out.");
      if (payment.payoutStatus === "processing") fail("CONFLICT", "This payout is already being processed.");

      const uIdx = store.users.findIndex((u) => u.id === me.id);
      store.users[uIdx] = { ...store.users[uIdx], payoutAccount: input.destination };
      return sendPayout(payment, input.destination, "code", me);
    }),

  refreshPayout: protectedProcedure.input(z.object({ id: z.string().max(64) })).mutation(async ({ input, ctx }) => {
    const payout = store.payouts.find((p) => p.id === input.id);
    if (!payout || (payout.ownerId !== ctx.user.id && !isStaff(ctx.user))) fail("NOT_FOUND", "Payout not found");
    if (payout.status === "processing") {
      try {
        const t = await paystack<{ status: string; reason?: string }>(`/transfer/verify/${encodeURIComponent(payout.reference)}`);
        applyTransferResult(payout.reference, t.status, t.reason);
      } catch (e) {
        toFail(e);
      }
    }
    return store.payouts.find((p) => p.id === input.id)!;
  }),

  // ── Staff ────────────────────────────────────────────────────────────
  adminList: adminProcedure.query(() => ({ payments: store.payments, payouts: store.payouts })),

  /** Release a payout without the renter's code (disputes, lost codes). */
  adminRelease: adminProcedure.input(z.object({ paymentId: z.string().max(64) })).mutation(async ({ input, ctx }) => {
    const payment = store.payments.find((p) => p.id === input.paymentId);
    if (!payment || payment.status !== "paid") fail("NOT_FOUND", "Paid payment not found");
    if (payment.payoutStatus === "paid" || payment.payoutStatus === "processing") fail("CONFLICT", "Already paid out or in progress.");
    const owner = store.users.find((u) => u.id === payment.ownerId);
    if (!owner?.payoutAccount) fail("PRECONDITION_FAILED", "The landlord hasn't saved a MoMo or bank account yet.");
    return sendPayout(payment, owner.payoutAccount, "admin", ctx.user);
  }),

  adminVerify: adminProcedure.input(z.object({ reference: z.string().max(80) })).mutation(async ({ input }) => {
    const p = store.payments.find((x) => x.reference === input.reference);
    if (!p) fail("NOT_FOUND", "Payment not found");
    try {
      const tx = await paystack<{ status: string; amount: number; currency: string; channel: string; paid_at: string }>(
        `/transaction/verify/${encodeURIComponent(p.reference)}`
      );
      if (tx.status === "success") finalizePaid(p.reference, tx);
      else if (tx.status === "failed" || tx.status === "abandoned") markPaymentFailed(p.reference, tx.status);
    } catch (e) {
      toFail(e);
    }
    return store.payments.find((x) => x.reference === input.reference)!;
  }),
});
