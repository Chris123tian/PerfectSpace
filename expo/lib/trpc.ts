import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Only use local backend port 4000 when developing locally on localhost
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return process.env.EXPO_PUBLIC_RORK_API_BASE_URL || "http://localhost:4000";
    }
    // On any deployed website (e.g. Vercel), ALWAYS use current origin
    return window.location.origin;
  }

  return process.env.EXPO_PUBLIC_RORK_API_BASE_URL || "http://localhost:4000";
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
