// Server-only configuration. The Durable Object passes its `env` in through
// setServerEnv(); local dev falls back to process.env. Never import from the
// client bundle.

type ServerEnv = Record<string, unknown>;

let injected: ServerEnv = {};

export function setServerEnv(env: unknown) {
  if (env && typeof env === "object") injected = env as ServerEnv;
}

export function serverEnv(name: string): string {
  const v = injected[name];
  if (typeof v === "string" && v.trim()) return v.trim();
  try {
    const p = typeof process !== "undefined" ? process.env?.[name] : undefined;
    if (typeof p === "string" && p.trim()) return p.trim();
  } catch {
    // no process on some edge runtimes
  }
  return "";
}

export const config = {
  get paystackSecret() {
    return serverEnv("PAYSTACK_SECRET_KEY");
  },
  get mnotifyKey() {
    return serverEnv("MNOTIFY_API_KEY");
  },
  get mnotifySender() {
    return serverEnv("MNOTIFY_SENDER_ID") || "PerfectSpce";
  },
};
