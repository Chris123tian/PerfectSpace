import * as z from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  isStaff,
  protectedProcedure,
  publicProcedure,
} from "../create-context";
import { store, ADMINS_INBOX } from "../../store";
import {
  checkLock,
  clearFailures,
  hashPassword,
  isHashed,
  passwordPolicyError,
  recordFailure,
  safeEqual,
  verifyPassword,
} from "../../security";
import {
  audit,
  createSession,
  fail,
  findUserIndex,
  profileCard,
  publicUser,
  revokeSessions,
} from "../helpers";
import type { User, UserRole, UserVerification } from "../../../types/property";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const shortText = (max: number) => z.string().trim().max(max);

const memberSince = () =>
  new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

// Fields a member may change on their own profile.
const profileUpdates = z
  .object({
    name: shortText(80).min(2),
    avatar: z.string().max(600),
    phone: shortText(32),
    bio: shortText(500),
    dob: shortText(20),
    country: shortText(80),
    region: shortText(80),
    whatsapp: shortText(32),
  })
  .partial(); // unknown keys (role, password, email…) are stripped

/** Equalizes timing for unknown emails so accounts can't be enumerated. */
const DUMMY_HASH =
  "pbkdf2$100000$76Td+bUjkpU5LuZX+9Lm0A==$G2h+k7epc/HZ06RMdVDpctUWWlyvODVUulsBjMeYbP4=";

async function fetchGoogleProfile(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) fail("UNAUTHORIZED", "Google sign-in could not be verified. Please try again.");
  const info = (await res.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!info.email || info.email_verified === false) {
    fail("UNAUTHORIZED", "Your Google account email is not verified.");
  }
  return {
    email: info.email.toLowerCase(),
    name: info.name || info.email.split("@")[0],
    picture: info.picture,
  };
}

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        email: z.string().trim().toLowerCase().max(254),
        password: z.string().max(256),
        portal: z.enum(["app", "admin"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const portal = input.portal ?? "app";
      const lockKeys = [`login:${input.email}`, `login-ip:${ctx.ip ?? "?"}`];
      for (const key of lockKeys) {
        const mins = checkLock(key);
        if (mins) fail("TOO_MANY_REQUESTS", `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
      }

      const idx = store.users.findIndex((u) => u.email.toLowerCase() === input.email);
      const found = idx === -1 ? null : store.users[idx];
      const ok = await verifyPassword(input.password, found?.password ?? DUMMY_HASH);
      if (!found || !ok) {
        lockKeys.forEach(recordFailure);
        audit(ctx, "login.failed", {
          success: false,
          actorEmail: input.email,
          targetType: "user",
          targetId: found?.id,
          detail: found && !found.password ? "Google account without a password" : `portal=${portal}`,
        });
        if (found && !found.password) {
          fail("UNAUTHORIZED", "This account uses Google sign-in. Continue with Google, then set a password in Settings.");
        }
        fail("UNAUTHORIZED", "Invalid email or password");
      }
      // Only the account counter resets on success; the IP counter keeps
      // running so an attacker can't reset it by using their own account.
      clearFailures(lockKeys[0]);

      if (!found.isActive) {
        audit({ ...ctx, user: found }, "login.blocked", { success: false, detail: "deactivated" });
        fail("FORBIDDEN", "Your account has been deactivated. Contact support.");
      }
      if (portal === "app" && isStaff(found)) {
        fail("FORBIDDEN", "This account must sign in through the staff portal.");
      }
      if (portal === "admin" && !isStaff(found)) {
        audit({ ...ctx, user: found }, "portal.denied", { success: false });
        fail("FORBIDDEN", "This portal is for staff accounts only.");
      }

      // Upgrade legacy plaintext passwords transparently.
      if (!isHashed(found.password)) {
        store.users[idx] = { ...found, password: await hashPassword(input.password), passwordSet: true };
      }

      const user = store.users[idx];
      const token = await createSession(ctx, user, portal);
      audit({ ...ctx, user }, "login", { targetType: "user", targetId: user.id, detail: `portal=${portal}` });
      return { user: publicUser(user), token };
    }),

  signup: publicProcedure
    .input(
      z.object({
        name: shortText(80).min(2, "Enter your full name"),
        email,
        password: z.string().max(128),
        phone: shortText(32),
        role: z.enum(["renter", "landlord", "admin", "superadmin"]),
        dob: shortText(20).optional(),
        country: shortText(80).optional(),
        region: shortText(80).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const policy = passwordPolicyError(input.password);
      if (policy) fail("BAD_REQUEST", policy);
      if (store.users.some((u) => u.email.toLowerCase() === input.email)) {
        fail("CONFLICT", "An account with this email already exists");
      }
      // Staff roles can never be self-assigned.
      const role: UserRole = input.role === "landlord" ? "landlord" : "renter";
      const newUser: User = {
        id: store.generateId("u"),
        name: input.name,
        email: input.email,
        password: await hashPassword(input.password),
        avatar: DEFAULT_AVATAR,
        phone: input.phone,
        role,
        bio: role === "landlord" ? "Property owner on Perfect Space." : "Looking for the perfect space.",
        propertiesCount: 0,
        reviewsCount: 0,
        rating: 0,
        memberSince: memberSince(),
        verified: false,
        isActive: true,
        dob: input.dob,
        country: input.country,
        region: input.region,
        authProvider: "password",
        passwordSet: true,
        createdAt: new Date().toISOString(),
      };
      store.users.push(newUser);
      const token = await createSession(ctx, newUser, "app");
      audit({ ...ctx, user: newUser }, "signup", { targetType: "user", targetId: newUser.id, detail: `role=${role}` });
      return { user: publicUser(newUser), token };
    }),

  googleAuth: publicProcedure
    .input(
      z.object({
        accessToken: z.string().min(10).max(4096),
        role: z.enum(["renter", "landlord"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const google = await fetchGoogleProfile(input.accessToken);
      const idx = store.users.findIndex((u) => u.email.toLowerCase() === google.email);

      if (idx !== -1) {
        const existing = store.users[idx];
        if (!existing.isActive) fail("FORBIDDEN", "Your account has been deactivated. Contact support.");
        if (isStaff(existing)) fail("FORBIDDEN", "This account must sign in through the staff portal.");
        // Keep a custom (uploaded) avatar; only refresh stock/Google ones.
        if (google.picture && !existing.avatar.includes("/api/images/")) {
          store.users[idx] = { ...existing, avatar: google.picture };
        }
        const user = store.users[idx];
        const token = await createSession(ctx, user, "app");
        audit({ ...ctx, user }, "login", { targetType: "user", targetId: user.id, detail: "google" });
        return { user: publicUser(user), token };
      }

      const role: UserRole = input.role ?? "renter";
      const newUser: User = {
        id: store.generateId("u"),
        name: google.name,
        email: google.email,
        avatar: google.picture || DEFAULT_AVATAR,
        phone: "",
        role,
        bio: role === "landlord" ? "Property owner on Perfect Space." : "Looking for the perfect space.",
        propertiesCount: 0,
        reviewsCount: 0,
        rating: 0,
        memberSince: memberSince(),
        verified: false,
        isActive: true,
        authProvider: "google",
        passwordSet: false,
        createdAt: new Date().toISOString(),
      };
      store.users.push(newUser);
      const token = await createSession(ctx, newUser, "app");
      audit({ ...ctx, user: newUser }, "signup", { targetType: "user", targetId: newUser.id, detail: "google" });
      return { user: publicUser(newUser), token };
    }),

  /** Current account for the presented session. */
  me: protectedProcedure.query(({ ctx }) => publicUser(ctx.user)),

  logout: publicProcedure.mutation(({ ctx }) => {
    if (ctx.session) {
      const idx = store.sessions.findIndex((s) => s.id === ctx.session!.id);
      if (idx !== -1) {
        store.sessions[idx] = { ...store.sessions[idx], loggedOutAt: new Date().toISOString(), endReason: "logout" };
      }
      audit(ctx, "logout", { targetType: "session", targetId: ctx.session.id });
    }
    return { success: true };
  }),

  /** Public profile card — no contact details or documents. */
  getUser: publicProcedure
    .input(z.object({ userId: z.string().max(64) }))
    .query(({ input, ctx }) => {
      const user = store.users.find((u) => u.id === input.userId);
      if (!user) return null;
      if (ctx.user && (ctx.user.id === user.id || isStaff(ctx.user))) return publicUser(user);
      return profileCard(user);
    }),

  updateProfile: protectedProcedure
    .input(z.object({ userId: z.string().optional(), updates: profileUpdates }))
    .mutation(({ input, ctx }) => {
      const idx = findUserIndex(ctx.user.id);
      const before = store.users[idx];
      const updates = Object.fromEntries(
        Object.entries(input.updates).filter(([, v]) => v !== undefined)
      ) as typeof input.updates;
      store.users[idx] = { ...before, ...updates };
      const after = store.users[idx];

      // Keep denormalized copies in sync.
      if (updates.avatar !== undefined || updates.name !== undefined) {
        for (let i = 0; i < store.properties.length; i++) {
          const p = store.properties[i];
          if (p.ownerId === after.id) {
            store.properties[i] = { ...p, ownerAvatar: after.avatar, ownerName: after.name };
          }
        }
      }
      audit(ctx, "profile.update", {
        targetType: "user",
        targetId: after.id,
        detail: `fields=${Object.keys(updates).join(",")}`,
      });
      return publicUser(after);
    }),

  getAllUsers: adminProcedure.query(() => store.users.map(publicUser)),

  updateUserAdmin: adminProcedure
    .input(
      z.object({
        userId: z.string().max(64),
        updates: z
          .object({
            isActive: z.boolean(),
            verified: z.boolean(),
            role: z.enum(["renter", "landlord", "admin"]),
          })
          .partial(),
      })
    )
    .mutation(({ input, ctx }) => {
      const idx = findUserIndex(input.userId);
      const target = store.users[idx];
      if (target.role === "superadmin") fail("FORBIDDEN", "The super admin account cannot be modified here.");
      if (ctx.user.role !== "superadmin") {
        if (isStaff(target)) fail("FORBIDDEN", "Only the super admin can modify staff accounts.");
        if (input.updates.role !== undefined) fail("FORBIDDEN", "Only the super admin can change roles.");
      }
      if (target.id === ctx.user.id) fail("FORBIDDEN", "You cannot modify your own account here.");

      const changes = Object.fromEntries(
        Object.entries(input.updates).filter(([, v]) => v !== undefined)
      ) as typeof input.updates;
      store.users[idx] = { ...target, ...changes };
      if (input.updates.isActive === false || input.updates.role !== undefined) {
        revokeSessions(target.id); // takes effect immediately
      }
      audit(ctx, "admin.user.update", {
        targetType: "user",
        targetId: target.id,
        detail: Object.entries(input.updates).map(([k, v]) => `${k}=${String(v)}`).join(", "),
      });
      return publicUser(store.users[idx]);
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.string().max(64) }))
    .mutation(({ input, ctx }) => {
      const target = store.users[findUserIndex(input.userId)];
      if (target.role === "superadmin" || target.id === ctx.user.id) fail("FORBIDDEN", "This account cannot be deleted.");
      if (isStaff(target) && ctx.user.role !== "superadmin") fail("FORBIDDEN", "Only the super admin can delete staff accounts.");
      deleteUserData(target.id);
      audit(ctx, "admin.user.delete", { targetType: "user", targetId: target.id, detail: target.email });
      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        currentPassword: z.string().max(256).optional(),
        newPassword: z.string().max(128),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const idx = findUserIndex(ctx.user.id);
      const user = store.users[idx];
      const lockKey = `pwchange:${user.id}`;
      const mins = checkLock(lockKey);
      if (mins) fail("TOO_MANY_REQUESTS", `Too many attempts. Try again in ${mins} minutes.`);

      // Google accounts without a password set their first one without a current password.
      if (user.password) {
        const ok = await verifyPassword(input.currentPassword ?? "", user.password);
        if (!ok) {
          recordFailure(lockKey);
          audit(ctx, "password.change", { success: false, targetType: "user", targetId: user.id, detail: "wrong current password" });
          fail("BAD_REQUEST", "Current password is incorrect");
        }
      }
      clearFailures(lockKey);
      const policy = passwordPolicyError(input.newPassword);
      if (policy) fail("BAD_REQUEST", policy);
      if (user.password && (await verifyPassword(input.newPassword, user.password))) {
        fail("BAD_REQUEST", "New password must be different from the current one.");
      }

      store.users[idx] = { ...user, password: await hashPassword(input.newPassword), passwordSet: true };
      revokeSessions(user.id, ctx.session.id); // sign out every other device
      audit(ctx, user.password ? "password.change" : "password.set", { targetType: "user", targetId: user.id });
      return { success: true, user: publicUser(store.users[idx]) };
    }),

  submitVerification: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        documentType: shortText(60).min(2),
        documentName: shortText(120).min(2),
        documentNumber: shortText(60).optional(),
        documentImage: z.string().url().max(600),
      })
    )
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "landlord") fail("FORBIDDEN", "Identity verification is only required for landlords.");
      const idx = findUserIndex(ctx.user.id);
      const user = store.users[idx];
      const documentUrl = new URL(input.documentImage);
      const requestOrigin = new URL(ctx.req.url).origin;
      const imageMatch = documentUrl.pathname.match(/^\/api\/images\/(img_[A-Za-z0-9_]+)$/);
      const accessKey = documentUrl.searchParams.get("k");
      const blob = imageMatch ? store.getBlob(imageMatch[1]) : null;
      if (
        documentUrl.origin !== requestOrigin ||
        !blob ||
        !blob.isPrivate ||
        blob.ownerId !== user.id ||
        !accessKey ||
        !blob.accessKey ||
        !safeEqual(accessKey, blob.accessKey)
      ) {
        fail("BAD_REQUEST", "Upload your identity document through the private document uploader.");
      }
      const now = new Date().toISOString();
      const verification: UserVerification = {
        status: "pending",
        documentType: input.documentType,
        documentName: input.documentName,
        documentNumber: input.documentNumber,
        documentImage: input.documentImage,
        submittedAt: now,
      };
      store.users[idx] = { ...user, verification, verified: false };

      store.notifications.unshift({
        id: store.generateId("n"),
        userId: ADMINS_INBOX,
        title: "Verification Request",
        message: `${user.name} submitted a ${input.documentType} for review.`,
        type: "verification",
        read: false,
        createdAt: now,
        data: { userId: user.id },
      });
      audit(ctx, "verification.submit", { targetType: "user", targetId: user.id, detail: verification.status });
      return publicUser(store.users[idx]);
    }),

  reviewVerification: adminProcedure
    .input(z.object({ userId: z.string().max(64), approve: z.boolean(), reason: shortText(300).optional() }))
    .mutation(({ input, ctx }) => {
      const idx = findUserIndex(input.userId);
      const user = store.users[idx];
      const verification: UserVerification = {
        ...(user.verification ?? { status: "pending" }),
        status: input.approve ? "approved" : "rejected",
        reviewedAt: new Date().toISOString(),
        rejectionReason: input.approve ? undefined : input.reason,
      };
      store.users[idx] = { ...user, verification, verified: input.approve };
      store.notifications.unshift({
        id: store.generateId("n"),
        userId: input.userId,
        title: input.approve ? "Identity Verified" : "Verification Rejected",
        message: input.approve
          ? "Your identity document was approved. You are now a verified member!"
          : `Your verification was not approved.${input.reason ? ` Reason: ${input.reason}` : ""} You can resubmit with a clearer document.`,
        type: "verification",
        read: false,
        createdAt: new Date().toISOString(),
      });
      audit(ctx, input.approve ? "verification.approve" : "verification.reject", {
        targetType: "user",
        targetId: user.id,
        detail: input.reason,
      });
      return publicUser(store.users[idx]);
    }),

  getSettings: protectedProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .query(({ ctx }) => {
      return store.userSettings[ctx.user.id] ?? { pushEnabled: true, emailEnabled: true, darkMode: false };
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        settings: z.object({
          pushEnabled: z.boolean().optional(),
          emailEnabled: z.boolean().optional(),
          darkMode: z.boolean().optional(),
        }),
      })
    )
    .mutation(({ input, ctx }) => {
      const existing = store.userSettings[ctx.user.id] ?? { pushEnabled: true, emailEnabled: true, darkMode: false };
      store.userSettings[ctx.user.id] = { ...existing, ...input.settings };
      return store.userSettings[ctx.user.id];
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .mutation(({ ctx }) => {
      if (ctx.user.role === "superadmin") fail("FORBIDDEN", "The super admin account cannot be deleted.");
      deleteUserData(ctx.user.id);
      audit(ctx, "account.delete", { targetType: "user", targetId: ctx.user.id, detail: ctx.user.email });
      return { success: true };
    }),
});

function deleteUserData(userId: string) {
  store.users = store.users.filter((u) => u.id !== userId);
  store.properties = store.properties.filter((p) => p.ownerId !== userId);
  const convIds = new Set(
    store.conversations.filter((c) => c.participantIds.includes(userId)).map((c) => c.id)
  );
  store.conversations = store.conversations.filter((c) => !convIds.has(c.id));
  store.chatMessages = store.chatMessages.filter((m) => !convIds.has(m.conversationId));
  store.bookings = store.bookings.filter((b) => b.renterId !== userId && b.ownerId !== userId);
  store.notifications = store.notifications.filter((n) => n.userId !== userId);
  revokeSessions(userId);
  delete store.savedProperties[userId];
  delete store.userSettings[userId];
}
