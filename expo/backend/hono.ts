import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "Perfect Space API is running" });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "Perfect Space API is running" });
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok", message: "Perfect Space API is healthy" });
});

export default app;
