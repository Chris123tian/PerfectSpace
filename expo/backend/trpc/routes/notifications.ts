import * as z from "zod";
import { createTRPCRouter, isStaff, protectedProcedure } from "../create-context";
import { store, ADMINS_INBOX } from "../../store";
import { audit, fail } from "../helpers";
import type { AppNotification, User } from "../../../types/property";

/** Your own notifications; staff also get the shared staff inbox. */
function mine(user: User, n: AppNotification) {
  return n.userId === user.id || (isStaff(user) && n.userId === ADMINS_INBOX);
}

export const notificationsRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) => store.notifications.filter((n) => mine(ctx.user, n))),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().max(64) }))
    .mutation(({ input, ctx }) => {
      const idx = store.notifications.findIndex((n) => n.id === input.id);
      if (idx !== -1 && mine(ctx.user, store.notifications[idx])) {
        store.notifications[idx] = { ...store.notifications[idx], read: true };
      }
      return { success: true };
    }),

  markAllRead: protectedProcedure
    .input(z.object({ userId: z.string().optional(), role: z.string().optional() }).optional())
    .mutation(({ ctx }) => {
      store.notifications = store.notifications.map((n) => (mine(ctx.user, n) && !n.read ? { ...n, read: true } : n));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().max(64) }))
    .mutation(({ input, ctx }) => {
      const target = store.notifications.find((n) => n.id === input.id);
      if (!target || !mine(ctx.user, target)) fail("NOT_FOUND", "Notification not found");
      store.notifications = store.notifications.filter((n) => n.id !== input.id);
      audit(ctx, "notification.delete", { targetType: "notification", targetId: input.id, detail: target.title });
      return { success: true };
    }),

  clearAll: protectedProcedure.mutation(({ ctx }) => {
    const before = store.notifications.length;
    store.notifications = store.notifications.filter((n) => !mine(ctx.user, n));
    const removed = before - store.notifications.length;
    audit(ctx, "notification.clear", { detail: `${removed} removed` });
    return { success: true, removed };
  }),
});
