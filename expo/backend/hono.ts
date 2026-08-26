import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow all origins in development; in production Vercel serves both frontend
// and backend from the same domain so the same-origin requests bypass CORS.
// We still need a permissive policy for local dev and any external clients.
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-trpc-source"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
    credentials: true,
  })
);

// ── tRPC – Vercel serverless path (/api/trpc/*) ───────────────────────────────
// When deployed on Vercel the `api/[...path].ts` handler receives requests at
// /api/<anything>.  The client calls /api/trpc/<procedure>.
app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// ── tRPC – local dev path (/trpc/*) ───────────────────────────────────────────
// The local Hono server (backend/run.ts) listens on port 4000.
// The client resolves to http://localhost:4000/api/trpc, so both paths work.
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  })
);

// ── Health / Status endpoints ─────────────────────────────────────────────────
app.get("/", (c) => {
  return c.json({ status: "ok", message: "Perfect Space API is running" });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "Perfect Space API is running" });
});

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    message: "Perfect Space API is healthy",
    timestamp: new Date().toISOString(),
  });
});

export default app;
