import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { store } from "@/backend/store";
import { Booking, BookingStatus } from "@/types/property";

export const bookingsRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return store.bookings;
  }),

  create: publicProcedure
    .input(z.object({ booking: z.unknown() }))
    .mutation(({ input }) => {
      const booking = input.booking as Booking;
      console.log("[Bookings] Creating:", booking.propertyTitle);
      store.bookings.unshift(booking);

      store.notifications.unshift({
        id: store.generateId("n"),
        userId: booking.ownerId,
        title: "New Viewing Request",
        message: `${booking.renterName} wants to view ${booking.propertyTitle} on ${booking.date}.`,
        type: "booking",
        read: false,
        createdAt: new Date().toISOString(),
        data: { bookingId: booking.id },
      });

      return booking;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
        currentUserId: z.string(),
        currentUserRole: z.string(),
      })
    )
    .mutation(({ input }) => {
      console.log("[Bookings] Updating:", input.id, input.status);
      const idx = store.bookings.findIndex((b) => b.id === input.id);
      if (idx === -1) throw new Error("Booking not found");
      store.bookings[idx].status = input.status as BookingStatus;

      const booking = store.bookings[idx];
      const targetUserId =
        input.currentUserRole === "landlord"
          ? booking.renterId
          : booking.ownerId;

      store.notifications.unshift({
        id: store.generateId("n"),
        userId: targetUserId,
        title: `Booking ${input.status.charAt(0).toUpperCase() + input.status.slice(1)}`,
        message: `Your viewing for ${booking.propertyTitle} has been ${input.status}.`,
        type: "booking",
        read: false,
        createdAt: new Date().toISOString(),
        data: { bookingId: input.id },
      });

      return store.bookings[idx];
    }),
});
