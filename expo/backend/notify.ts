// One place to tell a member something: in-app notification + SMS (mNotify).

import { store, ADMINS_INBOX } from "./store";
import { queueSms } from "./sms";
import type { AppNotification } from "../types/property";

type Notice = {
  title: string;
  message: string;
  type: AppNotification["type"];
  data?: Record<string, string>;
  /** SMS body; defaults to "Perfect Space: <message>". false = in-app only. */
  sms?: string | false;
};

export function smsAllowed(userId: string): boolean {
  const s = store.userSettings[userId] as { smsEnabled?: boolean } | undefined;
  return s?.smsEnabled !== false;
}

export function notifyUser(userId: string, n: Notice) {
  store.notifications.unshift({
    id: store.generateId("n"),
    userId,
    title: n.title,
    message: n.message,
    type: n.type,
    read: false,
    createdAt: new Date().toISOString(),
    data: n.data,
  });
  if (n.sms === false || userId === ADMINS_INBOX) return;
  const user = store.users.find((u) => u.id === userId);
  if (!user || !user.isActive || !smsAllowed(userId)) return;
  queueSms(user.phone || user.whatsapp, n.sms ?? `Perfect Space: ${n.message}`);
}

export function notifyStaff(n: Omit<Notice, "sms">) {
  notifyUser(ADMINS_INBOX, { ...n, sms: false });
}
