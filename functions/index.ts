// build: 2026-11-15 ip-throttle
// functions/index.ts — Perfect Space backend entrypoint.
//
// All API traffic is dispatched into the PerfectSpaceStore Durable Object
// ("global" instance), which runs the shared Hono + tRPC app on top of its
// durable SQLite storage. That makes the backend persistent (bookings,
// listings, images and users survive restarts/deploys) and reachable
// everywhere — preview, production, native apps and the Vercel deployment.

// @ts-expect-error — cross-folder import; resolved by the bundler.
import app from "../expo/backend/hono";
import { PerfectSpaceStore } from "./perfect-space-store";

// Re-export so the platform's DO dispatcher can find the class in the bundle.
export { PerfectSpaceStore };

type Env = {
  DO: Fetcher;
  PS_BOOTSTRAP_ADMIN_PASSWORD?: string;
  PS_BOOTSTRAP_SUPERADMIN_PASSWORD?: string;
};

// Direct-to-worker health route (also served via the DO at /api/health).
// v2: auth gains dob/country/region fields, password change and document verification;
// conversations gain support chats. v3: collision-proof id generation + country backfill migration in the store.
// v4: session auth (hashed tokens), PBKDF2 passwords, server-side scoping, audit log,
// super admin, image uploads stored in DO SQLite blobs, secure headers.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ping") {
      return Response.json({ ok: true, now: new Date().toISOString() });
    }

    // Everything else runs inside the durable object.
    const wrapped = new Request(request.url, request); // 2-arg form preserves headers
    wrapped.headers.set("X-Rork-DO-Class", "PerfectSpaceStore");
    wrapped.headers.set("X-Rork-DO-Id", "global");
    try {
      return await env.DO.fetch(wrapped);
    } catch (e) {
      console.error("[Worker] DO dispatch failed:", e);
      return app.fetch(request); // last-resort: serve in-memory from the worker
    }
  },
} satisfies ExportedHandler<Env>;
