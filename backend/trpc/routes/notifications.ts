import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { store } from "@/backend/store";

export const notificationsRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return store.notifications;
  }),

  markRead: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const idx = store.notifications.findIndex((n) => n.id === input.id);
      if (idx !== -1) {
        store.notifications[idx].read = true;
      }
      return { success: true };
    }),

  markAllRead: publicProcedure
    .input(z.object({ userId: z.string(), role: z.string() }))
    .mutation(({ input }) => {
      store.notifications = store.notifications.map((n) =>
        input.role === "admin" || n.userId === input.userId
          ? { ...n, read: true }
          : n
      );
      return { success: true };
    }),
});
