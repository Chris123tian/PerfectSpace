import * as z from "zod";
import { createTRPCRouter, superAdminProcedure } from "../create-context";
import { store } from "../../store";
import { audit, fail, publicUser } from "../helpers";
import type { Session, SessionView } from "../../../types/property";

const view = ({ tokenHash: _t, ...rest }: Session): SessionView => rest;

export const superadminRouter = createTRPCRouter({
  /** Every account with login/logout activity, newest activity first. */
  users: superAdminProcedure.query(() => {
    const byUser = new Map<string, Session[]>();
    for (const s of store.sessions) {
      const list = byUser.get(s.userId) ?? [];
      list.push(s);
      byUser.set(s.userId, list);
    }
    const now = Date.now();
    return store.users
      .map((u) => {
        const sessions = (byUser.get(u.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const logouts = sessions.filter((s) => s.loggedOutAt).map((s) => s.loggedOutAt!).sort().reverse();
        const active = sessions.filter((s) => !s.loggedOutAt && Date.parse(s.expiresAt) > now);
        return {
          ...publicUser(u),
          stats: {
            sessionsCount: sessions.length,
            activeSessions: active.length,
            lastLoginAt: sessions[0]?.createdAt ?? null,
            lastLogoutAt: logouts[0] ?? null,
            lastSeenAt: sessions.reduce<string | null>((m, s) => (!m || s.lastSeenAt > m ? s.lastSeenAt : m), null),
            lastIp: sessions[0]?.ip ?? null,
            lastDevice: sessions[0]?.userAgent ?? null,
          },
        };
      })
      .sort((a, b) => (b.stats.lastSeenAt ?? "").localeCompare(a.stats.lastSeenAt ?? ""));
  }),

  sessions: superAdminProcedure
    .input(z.object({ userId: z.string().max(64).optional(), limit: z.number().int().min(1).max(500).default(200) }))
    .query(({ input }) => {
      return store.sessions
        .filter((s) => !input.userId || s.userId === input.userId)
        .slice(0, input.limit)
        .map(view);
    }),

  revokeSession: superAdminProcedure
    .input(z.object({ sessionId: z.string().max(64) }))
    .mutation(({ input, ctx }) => {
      const idx = store.sessions.findIndex((s) => s.id === input.sessionId);
      if (idx === -1) fail("NOT_FOUND", "Session not found");
      const s = store.sessions[idx];
      if (!s.loggedOutAt) {
        store.sessions[idx] = { ...s, loggedOutAt: new Date().toISOString(), endReason: "revoked" };
      }
      audit(ctx, "session.revoke", { targetType: "session", targetId: s.id, detail: `user=${s.userId}` });
      return { success: true };
    }),

  audit: superAdminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).default(200),
        offset: z.number().int().min(0).default(0),
        search: z.string().trim().max(100).optional(),
        failuresOnly: z.boolean().optional(),
      })
    )
    .query(({ input }) => {
      const q = input.search?.toLowerCase();
      const filtered = store.auditLog.filter((e) => {
        if (input.failuresOnly && e.success) return false;
        if (!q) return true;
        return [e.action, e.actorEmail, e.targetId, e.detail, e.ip].some((v) => v?.toLowerCase().includes(q));
      });
      return {
        total: filtered.length,
        entries: filtered.slice(input.offset, input.offset + input.limit),
      };
    }),
});
