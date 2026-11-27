// SMS delivery through mNotify (https://api.mnotify.com). Messages are queued
// during a request and sent by drainOutbox(), which the Durable Object awaits
// after the request is handled, so delivery never blocks the business logic.

import { config } from "./env";

type Sms = { to: string; text: string };

const outbox: Sms[] = [];

/** Normalise to the international digits mNotify accepts (e.g. 233241234567). */
export function normalisePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 10) d = "233" + d.slice(1); // Ghana local format
  if (!/^\d{9,15}$/.test(d)) return null;
  return d;
}

export function queueSms(phone: string | undefined | null, text: string) {
  const to = normalisePhone(phone);
  if (!to) return;
  outbox.push({ to, text: text.slice(0, 459) });
}

export function smsConfigured() {
  return !!config.mnotifyKey;
}

export async function sendSms(to: string[], message: string): Promise<{ ok: boolean; detail: string }> {
  const key = config.mnotifyKey;
  if (!key) return { ok: false, detail: "MNOTIFY_API_KEY not set" };
  try {
    const res = await fetch(`https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        recipient: to,
        sender: config.mnotifySender,
        message,
        is_schedule: false,
        schedule_date: "",
      }),
    });
    const body = await res.text();
    const ok = res.ok && /success/i.test(body);
    if (!ok) console.error("[SMS] mNotify rejected:", res.status, body.slice(0, 300));
    return { ok, detail: body.slice(0, 300) };
  } catch (e) {
    console.error("[SMS] send failed:", e);
    return { ok: false, detail: String(e) };
  }
}

/** Send everything queued. Safe to call when nothing is queued. */
export async function drainOutbox(): Promise<void> {
  if (!outbox.length) return;
  const batch = outbox.splice(0, outbox.length);
  if (!config.mnotifyKey) return;
  // Group identical texts so a broadcast is one API call.
  const byText = new Map<string, string[]>();
  for (const m of batch) {
    const list = byText.get(m.text) ?? [];
    if (!list.includes(m.to)) list.push(m.to);
    byText.set(m.text, list);
  }
  await Promise.all(
    [...byText.entries()].map(async ([text, to]) => {
      for (let i = 0; i < to.length; i += 100) await sendSms(to.slice(i, i + 100), text);
    })
  );
}
