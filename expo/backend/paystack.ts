// Paystack integration: hosted checkout for renters, escrow-style release codes
// and transfers to landlords' MoMo / bank accounts.
// Docs: https://paystack.com/docs/api/

import { store } from "./store";
import { config } from "./env";
import { notifyStaff, notifyUser } from "./notify";
import type { Payment, Payout } from "../types/property";

const API = "https://api.paystack.co";

/** Currencies Paystack settles (the account's own country decides which work). */
export const PAYSTACK_CURRENCIES = ["GHS", "NGN", "ZAR", "KES", "USD", "XOF", "EGP", "RWF"] as const;

export function paystackConfigured() {
  return !!config.paystackSecret;
}

export class PaystackError extends Error {}

export async function paystack<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = config.paystackSecret;
  if (!key) throw new PaystackError("Payments aren't switched on yet. Please try again later.");
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON error page
  }
  if (!res.ok || !json?.status) {
    const msg = json?.message || `Paystack error (${res.status})`;
    console.error("[Paystack]", path, res.status, msg);
    throw new PaystackError(msg);
  }
  return json.data as T;
}

/** Verify Paystack's webhook signature (HMAC-SHA512 of the raw body). */
export async function verifyWebhookSignature(raw: string, signature: string | null): Promise<boolean> {
  const key = config.paystackSecret;
  if (!key || !signature) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function newReleaseCode() {
  const c = randomCode(8);
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

export function newReceiptNumber(prefix: "PS" | "PO") {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `${prefix}-${ymd}-${randomCode(5)}`;
}

export function newReference(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${randomCode(6).toLowerCase()}`;
}

export function fmtMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Mark a payment paid (idempotent — safe for both the redirect verify and the
 * webhook). Books the property, issues the receipt + release code, notifies.
 */
export function finalizePaid(reference: string, tx: { amount?: number; currency?: string; channel?: string; paid_at?: string }) {
  const idx = store.payments.findIndex((p) => p.reference === reference);
  if (idx === -1) return null;
  const current = store.payments[idx];
  if (current.status === "paid") return current;

  // Never trust a smaller amount than we asked for.
  const paidMinor = Number(tx.amount ?? 0);
  if (Math.round(current.amount * 100) > paidMinor || (tx.currency && tx.currency !== current.currency)) {
    store.payments[idx] = { ...current, status: "failed" };
    notifyStaff({
      title: "Payment amount mismatch",
      message: `${reference}: expected ${fmtMoney(current.amount, current.currency)}, got ${tx.currency} ${(paidMinor / 100).toFixed(2)}.`,
      type: "payment",
      data: { paymentId: current.id },
    });
    return store.payments[idx];
  }

  const paid: Payment = {
    ...current,
    status: "paid",
    channel: tx.channel,
    paidAt: tx.paid_at ?? new Date().toISOString(),
    receiptNumber: current.receiptNumber ?? newReceiptNumber("PS"),
    releaseCode: current.releaseCode ?? newReleaseCode(),
    payoutStatus: "locked",
  };
  store.payments[idx] = paid;

  const pIdx = store.properties.findIndex((p) => p.id === paid.propertyId);
  const clash = store.payments.find(
    (p) => p.id !== paid.id && p.propertyId === paid.propertyId && p.status === "paid" && p.paidAt && store.properties[pIdx]?.occupancy === "booked"
  );
  if (clash) {
    notifyStaff({
      title: "Double booking — refund needed",
      message: `${paid.renterName} paid for ${paid.propertyTitle}, which ${clash.renterName} had already booked. Refund ${paid.reference} in Paystack.`,
      type: "payment",
      data: { paymentId: paid.id },
    });
  }
  if (pIdx !== -1) {
    store.properties[pIdx] = { ...store.properties[pIdx], occupancy: "booked", bookedAt: paid.paidAt };
  }

  const money = fmtMoney(paid.amount, paid.currency);
  notifyUser(paid.renterId, {
    title: "Payment received",
    message: `You paid ${money} for ${paid.propertyTitle}. Receipt ${paid.receiptNumber}. Your release code is ${paid.releaseCode} — give it to the landlord only after you move in.`,
    type: "payment",
    data: { paymentId: paid.id },
  });
  notifyUser(paid.ownerId, {
    title: "Property booked & paid",
    message: `${paid.renterName} paid ${money} for ${paid.propertyTitle}. The renter will give you a release code after moving in — enter it under Payouts to withdraw.`,
    type: "payment",
    data: { paymentId: paid.id, propertyId: paid.propertyId },
  });
  notifyStaff({
    title: "New payment",
    message: `${paid.renterName} paid ${money} for ${paid.propertyTitle}.`,
    type: "payment",
    data: { paymentId: paid.id },
  });
  store.audit({ actorId: paid.renterId, action: "payment.paid", targetType: "payment", targetId: paid.id, detail: money, success: true });
  return paid;
}

export function markPaymentFailed(reference: string, status: "failed" | "abandoned") {
  const idx = store.payments.findIndex((p) => p.reference === reference);
  if (idx === -1 || store.payments[idx].status === "paid") return;
  store.payments[idx] = { ...store.payments[idx], status };
}

/** Apply a transfer webhook / status check to the matching payout. */
export function applyTransferResult(reference: string, status: string, reason?: string) {
  const idx = store.payouts.findIndex((p) => p.reference === reference);
  if (idx === -1) return;
  const payout = store.payouts[idx];
  if (payout.status === "paid") return;
  const next: Payout["status"] = status === "success" ? "paid" : status === "failed" || status === "reversed" ? "failed" : "processing";
  if (next === payout.status) return;
  store.payouts[idx] = {
    ...payout,
    status: next,
    completedAt: next === "paid" ? new Date().toISOString() : payout.completedAt,
    failureReason: next === "failed" ? reason || "Transfer failed" : undefined,
  };
  const pIdx = store.payments.findIndex((p) => p.id === payout.paymentId);
  if (pIdx !== -1) {
    store.payments[pIdx] = {
      ...store.payments[pIdx],
      // A failed transfer unlocks the code so the landlord can retry.
      payoutStatus: next === "failed" ? "locked" : next,
      payoutId: next === "failed" ? undefined : payout.id,
    };
  }
  const money = fmtMoney(payout.amount, payout.currency);
  if (next === "paid") {
    notifyUser(payout.ownerId, {
      title: "Payout sent",
      message: `${money} for ${payout.propertyTitle} was sent to ${payout.destination.bankName} ${mask(payout.destination.accountNumber)}. Receipt ${payout.receiptNumber}.`,
      type: "payment",
      data: { payoutId: payout.id },
    });
  } else if (next === "failed") {
    notifyUser(payout.ownerId, {
      title: "Payout failed",
      message: `We couldn't send ${money} for ${payout.propertyTitle}: ${reason || "transfer failed"}. Check your account details and try again.`,
      type: "payment",
      data: { payoutId: payout.id },
    });
    notifyStaff({ title: "Payout failed", message: `${payout.ownerName}: ${money} — ${reason ?? "failed"}`, type: "payment", data: { payoutId: payout.id } });
  }
}

export function mask(account: string) {
  return account.length <= 4 ? account : `••••${account.slice(-4)}`;
}
