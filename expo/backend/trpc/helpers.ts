import { TRPCError } from "@trpc/server";

import { store } from "../store";
import { randomToken, sha256Hex } from "../security";
import type { AuditEntry, SessionPortal, User } from "../../types/property";
import type { Context } from "./create-context";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export type PublicUser = Omit<User, "password">;

/** Strip secrets. Never send password hashes to any client. */
export function publicUser(user: User): PublicUser {
  const { password: _password, ...safe } = user;
  return safe;
}

/** What other members may see about someone (no contact details or documents). */
export function profileCard(user: User) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    bio: user.bio,
    rating: user.rating,
    reviewsCount: user.reviewsCount,
    propertiesCount: user.propertiesCount,
    memberSince: user.memberSince,
    verified: user.verified,
  };
}

export async function createSession(
  ctx: Pick<Context, "ip" | "userAgent">,
  user: User,
  portal: SessionPortal
): Promise<string> {
  const token = randomToken(32);
  const now = new Date();
  store.sessions.unshift({
    id: store.generateId("s"),
    tokenHash: await sha256Hex(token),
    userId: user.id,
    portal,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
  store.pruneSessions();
  return token;
}

/** End every live session of a user, optionally keeping one. */
export function revokeSessions(userId: string, keepSessionId?: string) {
  const now = new Date().toISOString();
  for (let i = 0; i < store.sessions.length; i++) {
    const s = store.sessions[i];
    if (s.userId === userId && !s.loggedOutAt && s.id !== keepSessionId) {
      store.sessions[i] = { ...s, loggedOutAt: now, endReason: "revoked" };
    }
  }
}

export function audit(
  ctx: Pick<Context, "ip"> & { user?: User | null },
  action: string,
  extra: Partial<Omit<AuditEntry, "id" | "at" | "action">> = {}
) {
  store.audit({
    actorId: ctx.user?.id ?? null,
    actorEmail: ctx.user?.email,
    actorRole: ctx.user?.role,
    ip: ctx.ip,
    success: true,
    ...extra,
    action,
  });
}

export function fail(code: TRPCError["code"], message: string): never {
  throw new TRPCError({ code, message });
}

export function findUserIndex(userId: string): number {
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) fail("NOT_FOUND", "User not found");
  return idx;
}
