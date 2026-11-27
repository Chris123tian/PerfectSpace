import { initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";

import { store } from "../store";
import { sha256Hex } from "../security";
import type { Session, User } from "../../types/property";

const SESSION_TOUCH_MS = 5 * 60_000; // throttle lastSeenAt writes

export function clientIp(req: Request): string | undefined {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([a-f0-9]{32,128})$/i.exec(header.trim());
  return match ? match[1] : null;
}

/** Resolve a raw session token to its live session + active user. */
export async function resolveSession(
  token: string | null
): Promise<{ session: Session; user: User } | null> {
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const idx = store.sessions.findIndex((s) => s.tokenHash === tokenHash);
  if (idx === -1) return null;
  const session = store.sessions[idx];
  if (session.loggedOutAt) return null;
  const now = Date.now();
  if (Date.parse(session.expiresAt) < now) {
    store.sessions[idx] = {
      ...session,
      loggedOutAt: session.expiresAt,
      endReason: "expired",
    };
    return null;
  }
  const user = store.users.find((u) => u.id === session.userId);
  if (!user || !user.isActive) return null;
  if (now - Date.parse(session.lastSeenAt) > SESSION_TOUCH_MS) {
    store.sessions[idx] = { ...session, lastSeenAt: new Date(now).toISOString() };
  }
  return { session: store.sessions[idx], user };
}

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  await store.ensureMigrated();
  const resolved = await resolveSession(bearerToken(opts.req));
  return {
    req: opts.req,
    ip: clientIp(opts.req),
    userAgent: opts.req.headers.get("user-agent")?.slice(0, 300) ?? undefined,
    user: resolved?.user ?? null,
    session: resolved?.session ?? null,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Never leak stack traces to clients.
    return {
      ...shape,
      data: { ...shape.data, stack: undefined },
      message: error.code === "INTERNAL_SERVER_ERROR" && !(error.cause instanceof Error)
        ? "Something went wrong. Please try again."
        : shape.message,
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const isStaff = (u: Pick<User, "role"> | null | undefined) =>
  u?.role === "admin" || u?.role === "superadmin";

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  }
  return next({ ctx: { ...ctx, user: ctx.user, session: ctx.session } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isStaff(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required." });
  }
  return next();
});

export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "superadmin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super admin access required." });
  }
  return next();
});
