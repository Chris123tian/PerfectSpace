// scripts/e2e-batch12.mjs — end-to-end tests for the 12-item security/admin batch.
// Run: bun scripts/e2e-batch12.mjs (expects `bun scripts/serve-dist.mjs` on :8080).
// Uses a persistent backend; only run against disposable staging data.
import { chromium } from "/usr/local/lib/node_modules/playwright/index.mjs";
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const API = process.env.API_URL;
if (process.env.ALLOW_LIVE_TEST_API !== "1" || !API) {
  throw new Error("Set API_URL and ALLOW_LIVE_TEST_API=1 only for a disposable staging backend.");
}
const TS = Date.now();
const TOWN = `Testville${TS % 100000}`;
const REGION = "Volta";
const ADMIN = { email: "admin@perfectspace.com", password: process.env.PS_BOOTSTRAP_ADMIN_PASSWORD ?? "" };
const SUPER = { email: "superadmin@perfectspace.com", password: process.env.PS_BOOTSTRAP_SUPERADMIN_PASSWORD ?? "" };
if (!ADMIN.password || !SUPER.password) {
  throw new Error("Set PS_BOOTSTRAP_ADMIN_PASSWORD and PS_BOOTSTRAP_SUPERADMIN_PASSWORD for staging tests.");
}
const results = [];
const created = [];

const t = async (name, fn) => {
  try { await fn(); results.push(["PASS", name]); console.log("  ✓ " + name); }
  catch (e) { results.push(["FAIL", name]); console.log("  ✗ " + name + " — " + (e?.message ?? e).toString().slice(0, 300)); }
};
const tid = (id) => `[data-testid="${id}"]`;
// Web alerts go through window.alert/confirm; keep their text so tests can assert on it.
const autoAccept = (page) => { page.dialogs = []; page.on("dialog", (d) => { page.dialogs.push(d.message()); d.accept().catch(() => {}); }); };
async function waitForDialog(page, re, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (page.dialogs.some((m) => re.test(m))) return; await page.waitForTimeout(250); }
  throw new Error(`no dialog matching ${re}; saw: ${page.dialogs.slice(-3).join(" | ")}`);
}

// ---- tiny PNG encoder (solid colour) -------------------------------------
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function solidPng(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3).map((_, i) => [r, g, b][i % 3])]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "e2e12-"));
const RED = join(dir, "red-321x123.png"); writeFileSync(RED, solidPng(321, 123, [220, 20, 20]));
const BLUE = join(dir, "blue-200x150.png"); writeFileSync(BLUE, solidPng(200, 150, [20, 40, 220]));
const DOC = join(dir, "doc-300x200.png"); writeFileSync(DOC, solidPng(300, 200, [240, 240, 200]));

// ---- API helpers -----------------------------------------------------------
async function rpc(path, input, token, method = "POST") {
  const headers = { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const res = method === "GET"
    ? await fetch(`${API}/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input ?? {} }))}`, { headers })
    : await fetch(`${API}/trpc/${path}`, { method: "POST", headers, body: JSON.stringify({ json: input ?? {} }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body?.error?.json?.message ?? `HTTP ${res.status}`), { status: res.status });
  return body.result.data.json;
}
const apiLogin = async (email, password, portal = "app") => (await rpc("auth.login", { email, password, portal })).token;

// ---- UI helpers -------------------------------------------------------------
async function signup(page, { role, name, email, password }) {
  await page.goto(BASE + "/signup", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(tid("signup-name"), { timeout: 30000 });
  await page.click(tid(`role-${role}`));
  await page.fill(tid("signup-name"), name);
  await page.fill(tid("signup-email"), email);
  await page.fill(tid("signup-phone"), "+233 24 555 0" + String(TS).slice(-3));
  await page.fill(tid("signup-dob"), "1990-01-15").catch(() => {});
  await page.fill(tid("signup-password"), password);
  await page.click(tid("signup-submit"));
  await page.waitForSelector(tid("search-input"), { timeout: 30000 });
}
async function appLogin(page, email, password) {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(tid("login-email"), { timeout: 30000 });
  await page.fill(tid("login-email"), email);
  await page.fill(tid("login-password"), password);
  await page.click(tid("login-submit"));
}
async function portalLogin(page, { email, password }) {
  await page.goto(BASE + "/portal", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(tid("portal-email"), { timeout: 30000 });
  await page.fill(tid("portal-email"), email);
  await page.fill(tid("portal-password"), password);
  await page.click(tid("portal-submit"));
  await page.waitForSelector(tid("admin-tab-overview"), { timeout: 30000 });
}
async function pickFile(page, triggerSelector, file) {
  const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 15000 }), page.click(triggerSelector)]);
  await chooser.setFiles(file);
}
async function naturalSize(page, url) {
  return page.evaluate((u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => rej(new Error("img load failed")); i.src = u; }), url);
}

const landlord = { name: `Kofi Tester ${TS % 1000}`, email: `pwtest.landlord+${TS}@example.com`, password: "Landlord123" };
const renter = { name: "Ama Renter", email: `pwtest.renter+${TS}@example.com`, password: "Renter1234" };
const NEW_PW = "Changed456";
let propertyId = null;

const browser = await chromium.launch();

// ==========================================================================
console.log("\n== 10/11. Separate staff portal + security ==");
{
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  autoAccept(page);
  await t("admin cannot sign in through the member app", async () => {
    await appLogin(page, ADMIN.email, ADMIN.password);
    await page.getByText("must sign in through the staff portal", { exact: false }).first().waitFor({ timeout: 15000 });
  });
  await t("login screen shows no admin credentials hint", async () => {
    const html = await page.content();
    if (/admin login|staff portal credentials/i.test(html.replace(/value="[^"]*"/g, ""))) throw new Error("credential hint visible");
  });
  await t("members are refused by the staff portal", async () => {
    await rpc("auth.signup", { name: renter.name, email: renter.email, password: renter.password, phone: "+233 20 111 2233", role: "renter" }).catch(() => {});
    await page.goto(BASE + "/portal", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("portal-email"), { timeout: 30000 });
    await page.fill(tid("portal-email"), renter.email);
    await page.fill(tid("portal-password"), renter.password);
    await page.click(tid("portal-submit"));
    await page.getByText("staff accounts only", { exact: false }).first().waitFor({ timeout: 15000 });
  });
  await t("API rejects unauthenticated data access (401)", async () => {
    const r = await fetch(`${API}/trpc/notifications.list`);
    if (r.status !== 401) throw new Error(`got ${r.status}`);
  });
  await t("weak passwords are rejected at signup", async () => {
    try { await rpc("auth.signup", { name: "Weak", email: `pwtest.weak+${TS}@example.com`, password: "abcdefgh", phone: "0200000000", role: "renter" }); throw new Error("accepted"); }
    catch (e) { if (e.message === "accepted") throw e; }
  });
  await t("account locks after 5 failed sign-ins", async () => {
    const email = `pwtest.lock+${TS}@example.com`;
    await rpc("auth.signup", { name: "Lock Test", email, password: "LockTest123", phone: "0200000001", role: "renter" });
    for (let i = 0; i < 5; i++) await apiLogin(email, "WrongPass999").catch(() => {});
    try { await apiLogin(email, "LockTest123"); throw new Error("correct password still accepted while locked"); }
    catch (e) { if (!/too many|locked|try again/i.test(e.message)) throw e; }
  });
  await page.close();
}

// ==========================================================================
console.log("\n== 1/6. Landlord uploads device photos; exact picture is saved ==");
{
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  autoAccept(page);
  await t("landlord signs up", async () => signup(page, { role: "landlord", ...landlord }));

  await t("add-property: picked photos upload immediately", async () => {
    await page.goto(BASE + "/add-property", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("property-title"), { timeout: 30000 });
    await pickFile(page, tid("add-image"), RED);
    await page.waitForSelector(tid("photo-0"), { timeout: 15000 });
    await page.waitForSelector(tid("photo-uploading-0"), { state: "detached", timeout: 30000 });
    await pickFile(page, tid("add-image"), BLUE);
    await page.waitForSelector(tid("photo-1"), { timeout: 15000 });
    await page.waitForSelector(tid("photo-uploading-1"), { state: "detached", timeout: 30000 });
    if (await page.locator('[data-testid^="photo-retry-"]').count()) throw new Error("an upload failed");
  });

  await t("add-property: region/town/neighbourhood submit", async () => {
    await page.fill(tid("property-title"), `E2E Loft ${TS}`);
    await page.fill(tid("property-description"), "Bright test loft created by the end-to-end suite.");
    await page.fill(tid("property-price"), "1500");
    await page.fill(tid("property-address"), "12 Test Street");
    await page.fill(tid("property-region"), REGION);
    await page.fill(tid("property-city"), TOWN);
    await page.fill(tid("property-neighborhood"), "Sunrise Estate");
    await page.click(tid("submit-property"));
    await page.waitForTimeout(4000);
  });

  let adminToken;
  await t("saved listing stores the uploaded photos, not stock images", async () => {
    adminToken = await apiLogin(ADMIN.email, ADMIN.password, "admin");
    const list = await rpc("properties.list", {}, adminToken, "GET");
    const p = list.find((x) => x.title === `E2E Loft ${TS}`);
    if (!p) throw new Error("listing not found");
    propertyId = p.id;
    if (p.region !== REGION || p.city !== TOWN || p.neighborhood !== "Sunrise Estate") throw new Error(`location ${p.region}/${p.city}/${p.neighborhood}`);
    if (p.images.length !== 2) throw new Error(`expected 2 images, got ${p.images.length}`);
    if (p.images.some((u) => !u.includes("/api/images/"))) throw new Error("non-uploaded image saved: " + p.images.join(","));
    const [w1, h1] = await naturalSize(page, p.images[0]);
    const [w2, h2] = await naturalSize(page, p.images[1]);
    if (w1 !== 321 || h1 !== 123) throw new Error(`photo 1 is ${w1}x${h1}, expected 321x123`);
    if (w2 !== 200 || h2 !== 150) throw new Error(`photo 2 is ${w2}x${h2}, expected 200x150`);
  });

  await t("avatar upload saves the picked picture", async () => {
    await page.goto(BASE + "/edit-profile", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("change-photo"), { timeout: 30000 });
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 15000 }),
      (async () => { await page.click(tid("change-photo")); await page.waitForTimeout(400); const lib = page.getByText(/library|gallery|choose/i).first(); if (await lib.count()) await lib.click().catch(() => {}); })(),
    ]);
    await chooser.setFiles(BLUE);
    await page.waitForTimeout(4000);
    await page.click(tid("save-profile"));
    await page.waitForTimeout(2500);
    const tok = await apiLogin(landlord.email, landlord.password);
    const me = await rpc("auth.me", {}, tok, "GET");
    if (!me.avatar.includes("/api/images/")) throw new Error("avatar not uploaded: " + me.avatar);
    const [w, h] = await naturalSize(page, me.avatar);
    if (w !== 200 || h !== 150) throw new Error(`avatar ${w}x${h}`);
  });

  // ---- 4. verification (landlord) ----
  await t("landlord uploads an ID document and waits for staff review", async () => {
    const preflightToken = await apiLogin(landlord.email, landlord.password);
    let rejectedExternalUrl = false;
    try {
      await rpc("auth.submitVerification", {
        documentType: "Passport",
        documentName: landlord.name,
        documentImage: "https://example.com/fake-document.png",
      }, preflightToken);
    } catch (error) {
      if (error.status !== 400 || !/private document uploader/i.test(error.message)) throw error;
      rejectedExternalUrl = true;
    }
    if (!rejectedExternalUrl) throw new Error("accepted an external document URL");

    await page.goto(BASE + "/edit-profile", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("start-verification"), { timeout: 30000 });
    await page.click(tid("start-verification"));
    await page.fill(tid("doc-name"), landlord.name);
    await page.fill(tid("doc-number"), "GHA-123456789-0").catch(() => {});
    await pickFile(page, tid("doc-image"), DOC);
    await page.waitForTimeout(4000);
    await page.click(tid("submit-verification"));
    await page.waitForTimeout(3000);
    const tok = await apiLogin(landlord.email, landlord.password);
    const me = await rpc("auth.me", {}, tok, "GET");
    if (me.verification?.status !== "pending" || me.verified) throw new Error("status " + me.verification?.status);
    const doc = me.verification.documentImage;
    if (!doc?.includes("?k=")) throw new Error("document not stored privately: " + doc);
    const anon = await fetch(doc.split("?")[0]);
    if (anon.status !== 404) throw new Error(`doc without key returned ${anon.status}`);
  });

  // ---- 2. password change ----
  await t("password change accepts the correct current password", async () => {
    await page.goto(BASE + "/settings", { waitUntil: "domcontentloaded" });
    await page.getByText("Change Password").first().click({ timeout: 30000 });
    await page.fill(tid("current-password"), landlord.password);
    await page.fill(tid("new-password"), NEW_PW);
    await page.fill(tid("confirm-password"), NEW_PW);
    await page.click(tid("submit-password"));
    await page.getByText(/password has been updated/i).first().waitFor({ timeout: 15000 }).catch(() => {});
    await apiLogin(landlord.email, NEW_PW);
    try { await apiLogin(landlord.email, landlord.password); throw new Error("old password still works"); } catch (e) { if (e.message === "old password still works") throw e; }
    landlord.password = NEW_PW;
  });

  await t("wrong current password is rejected with a clear message", async () => {
    await page.goto(BASE + "/settings", { waitUntil: "domcontentloaded" });
    await page.getByText("Change Password").first().click({ timeout: 30000 });
    await page.fill(tid("current-password"), "NotMyPassword1");
    await page.fill(tid("new-password"), "Another789x");
    await page.fill(tid("confirm-password"), "Another789x");
    page.dialogs.length = 0;
    await page.click(tid("submit-password"));
    await waitForDialog(page, /current password is incorrect/i);
  });

  // ---- 5. refresh ----
  await t("page reload keeps the session; refresh button works", async () => {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("refresh-button"), { timeout: 30000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("refresh-button"), { timeout: 30000 });
    await page.click(tid("refresh-button"));
    await page.waitForTimeout(1500);
    if (await page.locator(tid("login-banner")).count()) throw new Error("signed out after reload");
  });
  await ctx.close();
}

// ==========================================================================
console.log("\n== 4. Renters don't get the verification flow ==");
{
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  autoAccept(page);
  await t("renter sees no verification section and API refuses submission", async () => {
    await appLogin(page, renter.email, renter.password);
    await page.waitForSelector(tid("search-input"), { timeout: 30000 });
    await page.goto(BASE + "/edit-profile", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("save-profile"), { timeout: 30000 });
    if (await page.locator(tid("start-verification")).count()) throw new Error("verification shown to renter");
    const tok = await apiLogin(renter.email, renter.password);
    try { await rpc("auth.submitVerification", { documentType: "Passport", documentName: renter.name }, tok); throw new Error("accepted"); }
    catch (e) { if (e.message === "accepted") throw e; }
  });
  await t("renter opens a support chat", async () => {
    const tok = await apiLogin(renter.email, renter.password);
    await rpc("conversations.startSupportConversation", { initialMessage: `E2E support question ${TS}` }, tok);
  });
  await page.close();
}

// ==========================================================================
console.log("\n== 3. Admin console: pending, verification, support, notifications ==");
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  autoAccept(page);
  await t("admin signs in through /portal", async () => portalLogin(page, ADMIN));
  await t("admin approves the new listing", async () => {
    await page.click(tid("admin-tab-pending"));
    await page.click(tid(`approve-${propertyId}`), { timeout: 20000 });
    await page.waitForTimeout(2500);
  });
  await t("Verification tab lists submissions with the document image", async () => {
    await page.click(tid("admin-tab-verifications"));
    await page.click(tid("verif-filter-all"));
    await page.getByText(landlord.name).first().waitFor({ timeout: 20000 });
  });
  await t("Support tab shows member support chats and opens them", async () => {
    await page.click(tid("admin-tab-support"));
    await page.getByText(`E2E support question ${TS}`).first().waitFor({ timeout: 20000 });
    await page.getByText(`E2E support question ${TS}`).first().click();
    await page.locator("text=Ama Renter >> visible=true").first().waitFor({ timeout: 15000 });
    await page.goBack();
    await page.waitForSelector(tid("admin-tab-overview"), { timeout: 15000 });
  });
  await t("Notifications tab deletes a notification", async () => {
    await page.click(tid("admin-tab-notifications"));
    const del = page.locator('[data-testid^="admin-delete-notif-"]').first();
    await del.waitFor({ timeout: 20000 });
    const id = (await del.getAttribute("data-testid")).replace("admin-delete-notif-", "");
    await del.click();
    await page.locator(tid(`admin-notif-${id}`)).waitFor({ state: "detached", timeout: 15000 });
  });
  await t("regular admin has no Activity/Audit tabs", async () => {
    if (await page.locator(tid("admin-tab-audit")).count()) throw new Error("audit visible to admin");
  });
  await page.close();
}

// ==========================================================================
console.log("\n== 7. Region & town filters ==");
{
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  autoAccept(page);
  await t("town filter narrows the list to the new listing", async () => {
    await page.goto(BASE + "/filters", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("filter-town-input"), { timeout: 30000 });
    await page.fill(tid("filter-town-input"), TOWN);
    await page.click(tid("apply-filters"));
    await page.waitForSelector(`[data-testid="property-card-${propertyId}"]`, { timeout: 30000 });
    const cards = await page.locator('[data-testid^="property-card-"]').count();
    if (cards !== 1) throw new Error(`expected 1 card, got ${cards}`);
    await page.waitForSelector('[data-testid^="active-filter-"]', { timeout: 5000 });
  });
  await t("region chip is offered and filters by region", async () => {
    await page.goto(BASE + "/filters", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(tid("filter-town-input"), { timeout: 30000 });
    const clear = page.locator(tid("filter-town-clear"));
    if (await clear.count()) await clear.click();
    await page.fill(tid("filter-town-input"), "");
    const more = page.locator(tid("filter-region-more"));
    if (await more.count()) await more.click();
    await page.click(tid(`filter-region-${REGION}`), { timeout: 15000 });
    await page.click(tid("apply-filters"));
    await page.waitForSelector(`[data-testid="property-card-${propertyId}"]`, { timeout: 30000 });
  });
  await page.close();
}

// ==========================================================================
console.log("\n== 8/9. Super admin: user activity + audit trail ==");
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  autoAccept(page);
  await t("super admin signs in through /portal", async () => portalLogin(page, SUPER));
  await t("Activity tab shows users with login/logout times", async () => {
    await page.click(tid("admin-tab-activity"));
    await page.getByText(landlord.email).first().waitFor({ timeout: 30000 });
    await page.getByText("Last login").first().waitFor();
    await page.getByText("Last logout").first().waitFor();
  });
  await t("expanding a user lists their sessions", async () => {
    const tok = await apiLogin(SUPER.email, SUPER.password, "admin");
    const users = await rpc("superadmin.users", {}, tok, "GET");
    const u = users.find((x) => x.email === landlord.email);
    if (!u || u.stats.sessionsCount < 2 || !u.stats.lastLoginAt) throw new Error("no session stats");
    await page.click(tid(`activity-${u.id}`));
    await page.getByText(/In .* · (active|out)/).first().waitFor({ timeout: 15000 });
  });
  await t("Audit tab records logins, password changes and failures", async () => {
    await page.click(tid("admin-tab-audit"));
    await page.fill(tid("audit-search"), landlord.email.split("+")[0]);
    await page.waitForTimeout(2500);
    const tok = await apiLogin(SUPER.email, SUPER.password, "admin");
    const { entries } = await rpc("superadmin.audit", { limit: 500, search: String(TS) }, tok, "GET");
    const actions = new Set(entries.map((e) => e.action));
    for (const a of ["signup", "login", "password.change", "verification.submit"]) if (!actions.has(a)) throw new Error(`missing ${a}; have ${[...actions].join(",")}`);
    if (!entries.some((e) => !e.success)) throw new Error("no failed events recorded");
    await page.locator('[data-testid^="audit-"]').nth(2).waitFor({ timeout: 15000 });
  });
  await t("plain admin is refused super admin data (403)", async () => {
    const tok = await apiLogin(ADMIN.email, ADMIN.password, "admin");
    try { await rpc("superadmin.users", {}, tok, "GET"); throw new Error("allowed"); } catch (e) { if (e.status !== 403) throw e; }
  });
  await page.close();
}

// ==========================================================================
console.log("\n== 12. Data-collection disclosure ==");
{
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await t("signup consent links to the privacy page", async () => {
    await page.goto(BASE + "/signup", { waitUntil: "domcontentloaded" });
    await page.click(tid("signup-privacy"), { timeout: 30000 });
    await page.getByText("What we collect, and why").first().waitFor({ timeout: 15000 });
    for (const s of ["Identity verification", "Security and activity records", "How long we keep it"]) await page.getByText(s).first().waitFor();
  });
  await page.close();
}

// ---- cleanup ---------------------------------------------------------------
await t("cleanup: delete test accounts", async () => {
  const tok = await apiLogin(ADMIN.email, ADMIN.password, "admin");
  const users = await rpc("auth.getAllUsers", {}, tok, "GET");
  for (const u of users.filter((x) => /^pwtest\..*\+\d+@example\.com$/.test(x.email) || x.email.endsWith("@example.com") && x.email.includes(String(TS)))) {
    await rpc("auth.deleteUser", { userId: u.id }, tok).catch(() => {});
    created.push(u.email);
  }
});

await browser.close();
const failed = results.filter((r) => r[0] === "FAIL");
console.log(`\n${results.length - failed.length}/${results.length} passed; cleaned ${created.length} test accounts`);
process.exit(failed.length ? 1 : 0);
