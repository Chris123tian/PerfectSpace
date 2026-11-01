import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

// ── Rate limiting ──────────────────────────────────────────────────────
// Lightweight fixed-window limiter. Keeps the API responsive when a client (or
// a misbehaving script) floods it; high enough that real users never notice it.
const RATE_LIMIT_MAX = 300; // requests…
const RATE_LIMIT_WINDOW_MS = 60_000; // …per minute, per IP
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

app.use("*", async (c, next) => {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || c.req.header("x-real-ip");
  // No client IP available (e.g. an internal hop): do not bucket everyone
  // together — let the request through and rely on gateway-level limits.
  if (!ip) return next();
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    // Opportunistically clean out expired buckets to bound memory.
    if (rateBuckets.size > 5_000) {
      for (const [k, b] of rateBuckets) if (b.resetAt < now) rateBuckets.delete(k);
    }
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > RATE_LIMIT_MAX) {
    const retry = Math.ceil((bucket.resetAt - now) / 1000);
    return c.json(
      { error: "Too many requests. Try again shortly." },
      429,
      { "Retry-After": String(retry) }
    );
  }
  await next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow all origins in development; in production the same-origin setup bypasses
// CORS. We still need a permissive policy for local dev and external clients.
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-trpc-source"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
    credentials: true,
  }),
);

// ── tRPC – full /api/trpc path (Rork gateway + Vercel serverless) ─────────────
// Clients call `${baseUrl}/api/trpc/<procedure>`. On Vercel the api/[...path].ts
// handler forwards the full path to this Hono app.
app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

// ── tRPC – local dev path (/trpc/*) ───────────────────────────────────────────
// The local Hono server (backend/run.ts) listens on port 4000 and strips /api.
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  }),
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
