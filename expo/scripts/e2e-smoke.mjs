/**
 * End-to-end smoke test for the built Perfect Space web bundle.
 *
 * Serves expo/dist statically on :8080, runs the API locally on :4000, and
 * proxies the bundle's baked-in API host (dev-*.rorktest.dev) to the local
 * backend inside the browser. Verifies real sign-in, sign-up and
 * forgot-password flows against the real UI.
 *
 * Usage: node scripts/e2e-smoke.mjs   (from the expo/ folder)
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(
  process.env.RORK_PLAYWRIGHT_MODULE ?? "/usr/local/lib/node_modules/playwright/index.mjs"
);

const ROOT = fileURLToPath(new URL("../dist", import.meta.url));
const API_HOST = "https://dev-q69m7xvblmvl537mohj0a.rorktest.dev";
const LOCAL_API = "http://localhost:4000";
const APP_URL = "http://localhost:8080";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Minimal static server for the exported SPA.
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "x://y").pathname);
    let file = normalize(join(ROOT, path === "/" ? "/index.html" : path));
    if (!file.startsWith(ROOT)) file = join(ROOT, "index.html");
    let body;
    try {
      body = await readFile(file);
    } catch {
      file = join(ROOT, "index.html"); // SPA fallback
      body = await readFile(file);
    }
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});
await new Promise((resolve, reject) => {
  server.once("error", (e) => {
    if (e.code === "EADDRINUSE") resolve(); // a server from a previous run is already up
    else reject(e);
  });
  server.listen(8080, resolve);
});

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch();

// Proxy the baked-in API host to the local backend (adds CORS headers so the
// page origin can call it).
const PROXY_PATHS = [`${API_HOST}/api/`, `${API_HOST}/trpc/`, `${API_HOST}/api`, `${API_HOST}/trpc`];
const setupContext = async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (PROXY_PATHS.some((p) => url.startsWith(p))) {
      const localUrl = LOCAL_API + url.slice(API_HOST.length);
      const resp = await fetch(localUrl, {
        method: route.request().method(),
        headers: { "Content-Type": "application/json" },
        body: ["GET", "HEAD"].includes(route.request().method())
          ? undefined
          : route.request().postData(),
      });
      const body = await resp.text();
      return route.fulfill({
        status: resp.status,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body,
      });
    }
    return route.continue();
  });
  return context;
};

const pageErrors = [];

// Give the local backend a moment / verify reachable.
const health = await fetch(`${LOCAL_API}/api/health`).then((r) => r.json());
check("Local backend healthy", health?.status === "ok");

// Each flow runs in a fresh browser context so auth state never leaks between flows.
const runFlow = async (name, fn) => {
  const ctx = await setupContext();
  const p = await ctx.newPage();
  p.on("pageerror", (e) => pageErrors.push(String(e)));
  try {
    await fn(p);
  } catch (e) {
    check(name, false, String(e).slice(0, 140));
  } finally {
    await ctx.close();
  }
};

const SEEDED = "Modern Downtown Apartment";

// ---- Flow 0: Seeded listings visible without auth ----
await runFlow("Seeded listings visible on home", async (p) => {
  await p.goto(APP_URL, { waitUntil: "networkidle", timeout: 60000 });
  await p.getByText(SEEDED, { exact: false }).first().waitFor({ timeout: 25000 });
  check("Seeded listings visible on home", true);
});

// ---- Flow 1: Admin sign-in sees listings ----
await runFlow("Admin sign-in shows seeded listing", async (p) => {
  await p.goto(`${APP_URL}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await p.getByTestId("login-email").fill("admin@perfectspace.com", { timeout: 20000 });
  await p.getByTestId("login-password").fill("admin123");
  await p.getByTestId("login-submit").click();
  await p.getByText(SEEDED, { exact: false }).first().waitFor({ timeout: 25000 });
  check("Admin sign-in shows seeded listing", true);
});

// ---- Flow 2: Forgot password screen ----
await runFlow("Forgot password screen opens", async (p) => {
  await p.goto(`${APP_URL}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await p.getByTestId("forgot-password").click({ timeout: 20000 });
  await p.waitForURL("**/forgot-password", { timeout: 15000 });
  await p.getByText("Reset your password").first().waitFor({ timeout: 15000 });
  check("Forgot password screen opens", true);
});

// ---- Flow 3: New renter sign-up ----
await runFlow("New renter sign-up lands in app", async (p) => {
  await p.goto(`${APP_URL}/signup`, { waitUntil: "networkidle", timeout: 60000 });
  const fillByLabelish = async (labels, value) => {
    for (const label of labels) {
      const el = p.locator(`input[placeholder*="${label}" i]`).first();
      if (await el.count()) return el.fill(value);
    }
    throw new Error(`no input for ${labels.join("/")}`);
  };
  await fillByLabelish(["John Doe"], "QA Renter");
  await fillByLabelish(["email"], `qa.renter+${Date.now()}@example.com`);
  await fillByLabelish(["555"], "5550001111");
  await fillByLabelish(["Min 6"], "qapass123");
  await p.getByText("Create Account", { exact: false }).last().click();
  await p.getByText(SEEDED, { exact: false }).first().waitFor({ timeout: 25000 });
  check("New renter sign-up lands in app", true);
});

check("No page errors", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));

await browser.close();
server.close?.();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
