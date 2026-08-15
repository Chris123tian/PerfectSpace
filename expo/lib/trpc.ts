import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

export const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  if (typeof window !== "undefined") {
    if (
      !url ||
      (url.includes("localhost") &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1")
    ) {
      return window.location.origin;
    }
  }

  if (!url) {
    return "http://localhost:4000";
  }

  return url;
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
