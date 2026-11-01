import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Resolves the backend base URL — always the persistent Cloudflare backend.
 * The API is durable (Durable Object SQLite) and reachable everywhere:
 * preview, production, native apps and third-party hosts like Vercel.
 */
export const getBaseUrl = (): string => {
  // The platform-injected functions URL, when present.
  const functionsUrl = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL;
  if (functionsUrl && functionsUrl.startsWith("https://")) return functionsUrl;

  // Known deploy of the same worker (public URL, not a secret). Hardcoded so
  // platforms that don't inject Rork env vars — e.g. Vercel builds from the
  // GitHub repo — still reach the persistent backend out of the box.
  return "https://property-hub-app-i2wuyiy-backend.rork.app";
};

// tRPC v11's httpLink requires url to be `string | URL`, not a function.
// We work around this by lazily creating the client the first time it is
// needed, at which point window (and therefore window.location) is available.
let _trpcClient: ReturnType<typeof trpc.createClient> | null = null;

/** Lazily-created tRPC client — resolves the backend URL at first use. */
export const getTrpcClient = (): ReturnType<typeof trpc.createClient> => {
  if (!_trpcClient) {
    _trpcClient = trpc.createClient({
      links: [
        httpLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    });
  }
  return _trpcClient;
};

// Convenience re-export so existing import sites keep working.
// Created once at module evaluation time; on web metro evaluates modules
// after the page loads, so window.location is available by then.
export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
