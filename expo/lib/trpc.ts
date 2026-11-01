import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Resolves the backend base URL at request time.
 * - Prefers the persistent Cloudflare backend (EXPO_PUBLIC_RORK_FUNCTIONS_URL)
 *   so the API works everywhere — preview, production and native — and
 *   survives sandbox restarts. The sandbox dev URL (EXPO_PUBLIC_RORK_API_BASE_URL)
 *   is only a fallback for environments without a functions host.
 * - On deployed web hosts without either env URL, falls back to same-origin.
 */
export const getBaseUrl = (): string => {
  const functionsUrl = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL;
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  // Persistent edge backend — reachable from any surface.
  if (functionsUrl && functionsUrl.startsWith("https://")) return functionsUrl;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalPage = hostname === "localhost" || hostname === "127.0.0.1";

    // Trust the env URL unless it is a localhost URL on a deployed site
    if (envUrl && !(envUrl.includes("localhost") && !isLocalPage)) {
      return envUrl;
    }
    // Deployed site without a valid env URL: same-origin backend
    if (!isLocalPage) {
      return window.location.origin;
    }
    return envUrl || "http://localhost:4000";
  }

  // Native / server-side fallback
  return envUrl || "http://localhost:4000";
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
