// Security primitives for the Perfect Space backend.
//
// - Passwords: PBKDF2-SHA256 (100k iterations, 16-byte salt) via WebCrypto,
//   available on Cloudflare Workers, Bun and Node 20+. Stored as
//   `pbkdf2$<iterations>$<saltB64>$<hashB64>`. Legacy plaintext values are
//   still accepted once and immediately re-hashed (see auth.login).
// - Session tokens: 256-bit random, only their SHA-256 is persisted, so a
//   leaked database snapshot cannot be replayed as live sessions.
// - Login throttling: per-account and per-IP lockout after repeated failures.

const PBKDF2_ITERATIONS = 100_000; // Workers cap PBKDF2 at 100k iterations.
const encoder = new TextEncoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (avoids timing side channels). */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

export function isHashed(stored: string | undefined): boolean {
  return !!stored && stored.startsWith("pbkdf2$");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  if (!isHashed(stored)) return safeEqual(password, stored); // legacy plaintext
  const [, iter, saltB64, hashB64] = stored.split("$");
  const iterations = Number(iter);
  if (!iterations || !saltB64 || !hashB64) return false;
  const hash = await pbkdf2(password, fromB64(saltB64), iterations);
  return safeEqual(toB64(hash), hashB64);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(digest));
}

export function randomToken(bytes = 32): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomToken(12)}`;
}

/** Password policy for new passwords: 8+ chars with at least one letter and one number. */
export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password is too long.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

// ── Login throttling ────────────────────────────────────────────────────────
// Per-account keys lock after 5 failures. Per-IP keys get a much higher
// ceiling so one shared network (office, campus, mobile NAT) can't lock out
// everyone behind it, while still stopping password spraying from one IP.
const MAX_FAILURES = 5;
const MAX_IP_FAILURES = 30;
const maxFor = (key: string) => (key.includes("-ip:") ? MAX_IP_FAILURES : MAX_FAILURES);
const LOCK_MS = 15 * 60_000;
const failures = new Map<string, { count: number; lockedUntil: number; first: number }>();

export function checkLock(key: string): number {
  const entry = failures.get(key);
  if (!entry) return 0;
  const now = Date.now();
  if (entry.lockedUntil > now) return Math.ceil((entry.lockedUntil - now) / 60_000);
  if (entry.lockedUntil && entry.lockedUntil <= now) failures.delete(key);
  return 0;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = failures.get(key) ?? { count: 0, lockedUntil: 0, first: now };
  // Forget stale failures after the lock window.
  if (now - entry.first > LOCK_MS) {
    entry.count = 0;
    entry.first = now;
  }
  entry.count++;
  if (entry.count >= maxFor(key)) entry.lockedUntil = now + LOCK_MS;
  failures.set(key, entry);
  if (failures.size > 10_000) {
    for (const [k, v] of failures) if (v.lockedUntil < now && now - v.first > LOCK_MS) failures.delete(k);
  }
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
