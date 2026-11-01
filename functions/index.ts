// functions/index.ts — Perfect Space backend, deployed as a persistent
// Cloudflare Worker so the API is reachable everywhere (preview, production,
// native apps) and survives sandbox restarts.
//
// The full Hono + tRPC app is shared with the local dev server
// (expo/backend/hono.ts) — single source of truth. Edge runtimes have no
// filesystem, so the store runs in-memory from seeds there (see store.ts).

// @ts-expect-error — cross-folder import; resolved by the bundler.
import app from "../expo/backend/hono";

export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  },
};
