import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

export const getBaseUrl = (): string => {
  // This function is called lazily at request time, not at module init.
  // Checking window.location at call time ensures we always get the real
  // deployed domain, even when the bundle was built in a Node/SSR context
  // where window was undefined.
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Only point to the local backend when actively developing on localhost
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4000";
    }
    // On any deployed domain (Vercel, etc.) use the page's own origin
    return window.location.origin;
  }
  // Server-side / non-browser fallback
  return "http://localhost:4000";
};

// tRPC v11's httpLink requires url to be `string | URL`, not a function.
// We work around this by lazily creating the client the first time it is
// needed, at which point window (and therefore window.location) is available.
let _trpcClient: ReturnType<typeof trpc.createClient> | null = null;

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
// The object is created once at module evaluation time.
// On web this is fine because metro evaluates modules after the page loads.
export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
