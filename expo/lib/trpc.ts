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

// NOTE: the `url` here uses a *function* so tRPC resolves it lazily on each
// request, rather than once at module-initialization time.  This is critical
// for Expo web builds where the Metro bundler evaluates module code during
// bundling (in a Node context where window is undefined).
export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: () => `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
