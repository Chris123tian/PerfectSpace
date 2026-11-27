import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";

import { appRouter } from "./trpc/app-router";
import { bearerToken, clientIp, createContext, resolveSession } from "./trpc/create-context";
import { store } from "./store";
import { randomToken, safeEqual } from "./security";

const app = new Hono();

// ── Security headers ───────────────────────────────────────────────────────────────────────
// HSTS, nosniff, frame denial and a locked-down CSP (the API serves JSON and
// images only). Images must stay loadable cross-origin by the web app.
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], imgSrc: ["'self'"] },
    crossOriginResourcePolicy: "cross-origin",
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    strictTransportSecurity: "max-age=63072000; includeSubDomains",
    xFrameOptions: "DENY",
    referrerPolicy: "no-referrer",
  }),
);

// Cap request bodies everywhere (uploads get their own, larger cap).
app.use("/api/trpc/*", bodyLimit({ maxSize: 256 * 1024, onError: (c) => c.json({ error: "Request too large" }, 413) }));
app.use("/trpc/*", bodyLimit({ maxSize: 256 * 1024, onError: (c) => c.json({ error: "Request too large" }, 413) }));

// ── Rate limiting ──────────────────────────────────────────────────────
// Lightweight fixed-window limiter. Keeps the API responsive when a client (or
// a misbehaving script) floods it; high enough that real users never notice it.
const RATE_LIMIT_MAX = 300; // requests…
const RATE_LIMIT_WINDOW_MS = 60_000; // …per minute, per IP
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

app.use("*", async (c, next) => {
  const ip = clientIp(c.req.raw);
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

// ── Image uploads ─────────────────────────────────────────────────────────────────────────
// Photos are uploaded the moment they're picked and stored as binary rows in
// the Durable Object's SQLite (never inside the JSON snapshot). The client
// then saves the returned https URL — so every device sees the exact picture
// that was chosen, instead of a device-local blob:/file: URI.
const MAX_IMAGE_BYTES = 1_500_000;
const UPLOADS_PER_HOUR = 120;
const uploadCounts = new Map<string, { count: number; resetAt: number }>();

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return null;
}

app.post(
  "/api/upload",
  bodyLimit({ maxSize: 2_200_000, onError: (c) => c.json({ error: "Image is too large (max 1.5 MB)." }, 413) }),
  async (c) => {
    await store.ensureMigrated();
    const auth = await resolveSession(bearerToken(c.req.raw));
    if (!auth) return c.json({ error: "Please sign in to upload photos." }, 401);

    const now = Date.now();
    const bucket = uploadCounts.get(auth.user.id);
    if (!bucket || bucket.resetAt < now) uploadCounts.set(auth.user.id, { count: 1, resetAt: now + 3_600_000 });
    else if (++bucket.count > UPLOADS_PER_HOUR) return c.json({ error: "Upload limit reached. Try again later." }, 429);

    let body: { data?: string; kind?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid upload" }, 400);
    }
    const b64 = (body.data ?? "").replace(/^data:[^;]+;base64,/, "");
    if (!b64) return c.json({ error: "No image data" }, 400);
    let bytes: Uint8Array;
    try {
      const bin = atob(b64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return c.json({ error: "Invalid image data" }, 400);
    }
    if (bytes.length > MAX_IMAGE_BYTES) return c.json({ error: "Image is too large (max 1.5 MB)." }, 413);
    const mime = sniffMime(bytes);
    if (!mime) return c.json({ error: "Only JPEG, PNG or WebP images are allowed." }, 415);

    const kind = body.kind === "document" ? "document" : body.kind === "avatar" ? "avatar" : "image";
    const isPrivate = kind === "document";
    const id = `img_${randomToken(12)}`;
    const accessKey = isPrivate ? randomToken(16) : undefined;
    store.putBlob({ id, mime, data: bytes, ownerId: auth.user.id, isPrivate, accessKey, createdAt: new Date().toISOString() });

    const origin = new URL(c.req.url).origin.replace(/^http:\/\/(?!localhost|127\.)/, "https://");
    const url = `${origin}/api/images/${id}${accessKey ? `?k=${accessKey}` : ""}`;
    store.audit({ actorId: auth.user.id, actorEmail: auth.user.email, actorRole: auth.user.role, action: "upload", detail: `${kind} ${bytes.length}B`, targetId: id, ip: clientIp(c.req.raw), success: true });
    return c.json({ id, url });
  },
);

app.get("/api/images/:id", async (c) => {
  const blob = store.getBlob(c.req.param("id"));
  if (!blob) return c.json({ error: "Not found" }, 404);
  if (blob.isPrivate && !safeEqual(c.req.query("k") ?? "", blob.accessKey ?? "\u0000")) {
    return c.json({ error: "Not found" }, 404);
  }
  return new Response(blob.data as BodyInit, {
    headers: {
      "Content-Type": blob.mime,
      "Cache-Control": blob.isPrivate ? "private, max-age=3600" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

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
