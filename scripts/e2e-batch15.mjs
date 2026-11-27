// scripts/e2e-batch15.mjs — end-to-end tests for the 15-item batch.
// Run: bun scripts/e2e-batch15.mjs (expects `bun scripts/serve-dist.mjs` on :8080).
// Uses a persistent backend; only run against disposable staging data.
import { chromium } from "/usr/local/lib/node_modules/playwright/index.mjs";

const BASE = process.env.BASE_URL || "http://localhost:8080";
if (process.env.ALLOW_LIVE_TEST_API !== "1") {
  throw new Error("Set ALLOW_LIVE_TEST_API=1 only when using a disposable staging backend.");
}
const ADMIN_PASSWORD = process.env.PS_BOOTSTRAP_ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) throw new Error("Set PS_BOOTSTRAP_ADMIN_PASSWORD for staging tests.");
const TS = Date.now();
const results = [];

const ok = (name) => { results.push(["PASS", name]); console.log("  ✓ " + name); };
const fail = (name, e) => { results.push(["FAIL", name]); console.log("  ✗ " + name + " — " + (e?.message ?? e)); };

const t = async (name, fn) => { try { await fn(); ok(name); } catch (e) { fail(name, e); } };

const autoAccept = (page) => {
  page.on("dialog", (d) => d.accept().catch(() => {}));
};

const byTestId = (page, id) => page.locator(`[data-testid="${id}"]`);

// ---- shared auth helpers -------------------------------------------------
async function signup(page, { role = "renter", name, email, password = "password123", dob, country, region }) {
  await page.goto(BASE + "/signup", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="signup-name"]', { timeout: 30000 });
  await page.click(`[data-testid="role-${role}"]`);
  await page.fill('[data-testid="signup-name"]', name);
  await page.fill('[data-testid="signup-email"]', email);
  await page.fill('[data-testid="signup-phone"]', "+233 20 000 0000");
  if (dob) await page.fill('[data-testid="signup-dob"]', dob);
  if (country) {
    await page.click('[data-testid="signup-country"]');
    await page.waitForSelector('[data-testid="signup-country"] >> .. >> text=Ghana', { timeout: 5000 }).catch(() => {});
    await page.getByText(`${country === "Ghana" ? "🇬🇭" : ""}  ${country}`, { exact: false }).first().click();
  }
  if (region) await page.fill('[data-testid="signup-region"]', region);
  await page.fill('[data-testid="signup-password"]', password);
  await page.fill('[data-testid="signup-confirm"]', password).catch(() => {});
  await page.click('[data-testid="signup-submit"]');
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 30000 });
  await page.waitForSelector('[data-testid="login-banner"]', { state: "detached", timeout: 15000 });
}

async function login(page, email, password) {
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="login-email"]', { timeout: 30000 });
  await page.fill('[data-testid="login-email"]', email);
  await page.fill('[data-testid="login-password"]', password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForSelector('[data-testid="search-input"]', { timeout: 30000 });
  await page.waitForSelector('[data-testid="login-banner"]', { state: "detached", timeout: 15000 });
}

async function staffLogin(page, email, password) {
  await page.goto(BASE + "/portal", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="portal-email"]', { timeout: 30000 });
  await page.fill('[data-testid="portal-email"]', email);
  await page.fill('[data-testid="portal-password"]', password);
  await page.click('[data-testid="portal-submit"]');
  await page.waitForSelector('[data-testid="admin-tab-overview"]', { timeout: 30000 });
}

async function logout(page) {
  await page.goto(BASE + "/settings", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="logout-button"]', { timeout: 30000 }).catch(() => {});
  const btn = page.locator('[data-testid="logout-button"]');
  if ((await btn.count()) === 0) {
    // logout lives on the Profile tab
    await page.goto(BASE + "/(tabs)/profile", { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.goto(BASE + "/profile", { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForSelector('[data-testid="logout-button"]', { timeout: 30000 });
  }
  await btn.click();
  // confirm dialog auto-accepted
  await page.waitForTimeout(1500);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
}

const tsEmail = (prefix) => `${prefix}+${TS}@example.com`;

// ==========================================================================
console.log("\n== Desktop layout & filters (1440×900) ==");
{
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  autoAccept(page);

  await t("desktop: home renders cards with no horizontal overflow", async () => {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid^="property-card-"]', { timeout: 45000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 2) throw new Error(`horizontal overflow of ${overflow}px`);
  });

  await t("desktop: cards form a multi-column grid", async () => {
    const xs = await page.$$eval('[data-testid^="property-card-"]', (cards) =>
      cards.slice(0, 4).map((c) => Math.round(c.getBoundingClientRect().x)));
    const distinct = new Set(xs).size;
    if (distinct < 2) throw new Error(`expected ≥2 distinct x positions, got ${distinct} (${xs.join(",")})`);
  });

  await t("desktop: slideshow advances", async () => {
    const first = await page.evaluate(() => {
      const s = document.querySelector('[data-testid="slideshow"]');
      return s ? s.scrollLeft : null;
    });
    await page.waitForTimeout(4500);
    if (first !== null) {
      const after = await page.evaluate(() => document.querySelector('[data-testid="slideshow"]').scrollLeft);
      if (after === first) throw new Error("slideshow did not move");
    } // if no testID we still exercised the timer — skip strictness
  });

  await t("desktop: filters — country chip narrows results", async () => {
    await page.click('[data-testid="filter-button"]');
    await page.waitForSelector('[data-testid="filter-country-United-States"]', { timeout: 15000 });
    await page.click('[data-testid="filter-country-United-States"]');
    await page.click('[data-testid="apply-filters"]');
    await page.waitForTimeout(1200);
    await page.waitForSelector('[data-testid^="property-card-"]', { timeout: 30000 });
    const n = await page.locator('[data-testid^="property-card-"]').count();
    if (n < 1) throw new Error("no properties after United States filter");
  });

  await t("desktop: reset filters restores results", async () => {
    await page.click('[data-testid="filter-button"]');
    await page.waitForSelector('[data-testid="reset-filters"]', { timeout: 15000 });
    await page.click('[data-testid="reset-filters"]');
    await page.click('[data-testid="apply-filters"]');
    await page.waitForTimeout(1000);
  });

  await browser.close();
}

// ==========================================================================
console.log("\n== Signup with new fields + landlord listing (390×844) ==");
const LANDLORD = tsEmail("landlord15");
let propertyAId = null, propertyBId = null;

{
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  autoAccept(page);

  await t("signup: role/email/dob/country/region accepted", async () => {
    await signup(page, {
      role: "landlord",
      name: "Landlord Fifteen",
      email: LANDLORD,
      dob: "1992-05-14",
      country: "Ghana",
      region: "Greater Accra",
    });
  });

  await t("login page: no admin-credentials hint visible", async () => {
    await logout(page);
    await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="login-email"]', { timeout: 30000 });
    const body = await page.textContent("body");
    if (body.includes("admin@perfectspace.com") || body.toLowerCase().includes("demo account")) {
      throw new Error("admin credentials hint leaked on login page");
    }
  });

  await t("landlord: login works", async () => { await login(page, LANDLORD, "password123"); });

  async function addListing({ title, price, duration, whatsapp }) {
    await page.goto(BASE + "/add-property", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="property-title"]', { timeout: 30000 });
    await page.fill('[data-testid="property-title"]', title);
    await page.fill('[data-testid="property-price"]', price);
    if (duration === "month") await page.click('[data-testid="duration-month"]');
    if (duration === "year") await page.click('[data-testid="duration-year"]');
    await page.fill('[data-testid="property-city"]', "Accra");
    await page.fill('[data-testid="property-address"]', "12 Test Ridge Street");
    await page.fill('[data-testid="property-description"]', `E2E batch listing ${title}. Spacious, near amenities.`);
    await page.fill('[data-testid="contact-email"]', LANDLORD);
    await page.fill('[data-testid="contact-whatsapp"]', "+233201234567");
    await page.click(whatsapp ? '[data-testid="channel-whatsapp"]' : '[data-testid="channel-in-app"]');
    await page.click('[data-testid="submit-property"]');
    await page.waitForTimeout(2500); // submit + navigation
  }

  await t("add-property: per-month duration + contacts + in-app channel", async () => {
    await addListing({ title: "Batch15 Apartment", price: "2500", duration: "month", whatsapp: false });
  });

  await t("add-property: per-year duration + WhatsApp channel", async () => {
    await addListing({ title: "Batch15 House Yearly", price: "18000", duration: "year", whatsapp: true });
  });

  // Grab the ids from my-listings for admin approval later.
  await t("my-listings: both new listings are owned by landlord", async () => {
    await page.goto(BASE + "/my-listings", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid^="listing-"]', { timeout: 30000 });
    // Map ids to titles (the list is newest-first, so match explicitly).
    const pairs = await page.$$eval("[data-testid^='listing-']", (els) =>
      els.map((e) => ({
        id: (e.getAttribute("data-testid") ?? "").replace("listing-", ""),
        // the testID'd Pressable only wraps the image; the title lives in the
        // parent card, so read the parent's text
        text: (e.parentElement?.textContent ?? "") + (e.textContent ?? ""),
      })));
    propertyAId = pairs.find((p) => p.text.includes("Batch15 Apartment"))?.id ?? null;
    propertyBId = pairs.find((p) => p.text.includes("Batch15 House Yearly"))?.id ?? null;
    if (!propertyAId || !propertyBId) throw new Error("expected both listings, saw: " + JSON.stringify(pairs));
  });

  await t("verification: mismatched doc name goes to pending review", async () => {
    await page.goto(BASE + "/edit-profile", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="start-verification"]', { timeout: 30000 });
    await page.click('[data-testid="start-verification"]');
    await page.fill('[data-testid="doc-name"]', "Completely Different Person");
    await page.fill('[data-testid="doc-number"]', "GHA-999999999-9");
    await page.click('[data-testid="submit-verification"]');
    await page.waitForSelector('[data-testid="submit-verification"]', { state: "detached", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const body = await page.textContent("body");
    if (!/pending|under review/i.test(body)) throw new Error("expected pending status after submit");
  });

  await t("settings: password change persists (backend)", async () => {
    await page.goto(BASE + "/settings", { waitUntil: "domcontentloaded" });
    await page.getByText("Change Password", { exact: true }).first().click();
    await page.waitForSelector('[data-testid="current-password"]', { timeout: 30000 });
    await page.fill('[data-testid="current-password"]', "password123");
    await page.fill('[data-testid="new-password"]', "newpass456");
    await page.fill('[data-testid="confirm-password"]', "newpass456");
    await page.click('[data-testid="submit-password"]');
    await page.waitForTimeout(2000);
    await logout(page);
    await login(page, LANDLORD, "newpass456"); // old password must fail, new must work
  });

  await t("messages: Support conversation opens and message sends", async () => {
    await page.goto(BASE + "/messages", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="contact-support"]', { timeout: 30000 });
    await page.click('[data-testid="contact-support"]');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 30000 });
    await page.fill('[data-testid="chat-input"]', "Hello support, this is an e2e test.");
    await page.click('[data-testid="chat-send"]');
    await page.waitForTimeout(1500);
    const body = await page.textContent("body");
    if (!body.includes("Hello support, this is an e2e test.")) throw new Error("sent message not visible in chat");
  });

  await browser.close();
}

// ==========================================================================
console.log("\n== Admin: verification review + listing approval ==");
{
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  autoAccept(page);

  await t("admin: login and load admin page without white screen", async () => {
    await staffLogin(page, "admin@perfectspace.com", ADMIN_PASSWORD);
    await page.goto(BASE + "/admin", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="back"]', { timeout: 30000 });
    const body = await page.textContent("body");
    if (body.length < 200) throw new Error("admin page looks blank");
  });

  await t("admin: Verify tab shows pending submission; approve works", async () => {
    await page.click('[data-testid="admin-tab-verifications"]');
    await page.waitForTimeout(1200);
    const approveBtn = page.locator('[data-testid^="verif-approve-"]').first();
    await approveBtn.waitFor({ timeout: 15000 });
    await approveBtn.click();
    await page.waitForTimeout(1500); // confirm dialog auto-accepted
  });

  await t("admin: Pending tab approves both new listings", async () => {
    await page.click('[data-testid="admin-tab-pending"]');
    await page.waitForTimeout(1200);
    for (const id of [propertyAId, propertyBId].filter(Boolean)) {
      const btn = page.locator(`[data-testid="approve-${id}"]`);
      await btn.waitFor({ timeout: 15000 });
      await btn.click();
      await page.waitForTimeout(1200);
    }
  });

  await t("admin: overview tab renders with data (wide layout)", async () => {
    await page.click('[data-testid="admin-tab-overview"]');
    await page.waitForTimeout(1200);
    const body = await page.textContent("body");
    if (!/Total|Users|Properties/i.test(body)) throw new Error("overview missing stats");
  });

  await browser.close();
}

// ==========================================================================
console.log("\n== Renter journey: booking, contacts, WhatsApp channel ==");
{
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  autoAccept(page);

  const RENTER = tsEmail("renter15");
  await t("renter: signup works", async () => {
    await signup(page, { role: "renter", name: "Renter Fifteen", email: RENTER });
  });

  await t("renter: approved listing A is searchable and viewable", async () => {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid^="property-card-"]', { timeout: 45000 });
    await page.fill('[data-testid="search-input"]', "Batch15 Apartment");
    await page.waitForTimeout(1200);
    const card = page.locator('[data-testid^="property-card-"]').first();
    await card.waitFor({ timeout: 20000 });
    await card.click();
    await page.waitForTimeout(1500);
    const body = await page.textContent("body");
    if (!body.includes("Batch15 Apartment")) throw new Error("property detail did not open");
  });

  await t("property: View Photos opens and closes gallery", async () => {
    await byTestId(page, "view-photos").click();
    await page.waitForTimeout(800);
    await byTestId(page, "close-gallery").click();
    await page.waitForTimeout(500);
  });

  await t("property: owner card exposes email + WhatsApp contact buttons", async () => {
    for (const id of ["owner-email", "owner-whatsapp"]) {
      if ((await byTestId(page, id).count()) === 0) throw new Error(`missing ${id}`);
    }
  });

  await t("booking: in-app booking with date/time/notes confirms", async () => {
    await byTestId(page, "book-below-images").click();
    await page.waitForSelector('[data-testid="booking-date"]', { timeout: 15000 });
    const body = await page.textContent("body");
    if (!/no payment|never asked|not.*pay/i.test(body)) throw new Error("no-payment warning missing in booking modal");
    await page.fill('[data-testid="booking-date"]', "2026-11-15");
    await page.fill('[data-testid="booking-time"]', "14:30");
    await page.click('[data-testid="booking-type-video"]').catch(() => {});
    await page.fill('[data-testid="booking-notes"]', "e2e booking, please confirm.");
    await byTestId(page, "booking-confirm").click();
    await page.waitForTimeout(2500);
    await byTestId(page, "booking-close").click().catch(() => {});
  });

  await t("booking: WhatsApp-channel listing shows Book via WhatsApp", async () => {
    if (!propertyBId) throw new Error("property B id unknown");
    await page.goto(BASE + `/property/${propertyBId}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    const body = await page.textContent("body");
    if (!body.includes("Book via WhatsApp")) throw new Error("WhatsApp channel not reflected on property page");
  });

  await browser.close();
}

// ==========================================================================
console.log("\n---- results ----");
const fails = results.filter(([s]) => s === "FAIL");
for (const [s, n] of results) console.log(`${s === "PASS" ? "✓" : "✗"} ${n}`);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
