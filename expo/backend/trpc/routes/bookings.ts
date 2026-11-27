import * as z from "zod";
import { createTRPCRouter, isStaff, protectedProcedure } from "../create-context";
import { store } from "../../store";
import { audit, fail } from "../helpers";
import type { Booking } from "../../../types/property";

export const bookingsRouter = createTRPCRouter({
  /** Your bookings as renter or owner; staff see all. */
  list: protectedProcedure.query(({ ctx }) => {
    if (isStaff(ctx.user)) return store.bookings;
    return store.bookings.filter((b) => b.renterId === ctx.user.id || b.ownerId === ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        booking: z.object({
          propertyId: z.string().max(64),
          date: z.string().trim().min(1).max(40),
          time: z.string().trim().max(40),
          notes: z.string().trim().max(1000).default(""),
          type: z.enum(["in_person", "video"]).optional(),
        }),
      })
    )
    .mutation(({ input, ctx }) => {
      const property = store.properties.find((p) => p.id === input.booking.propertyId);
      if (!property || property.status !== "active") fail("NOT_FOUND", "This property is not available for booking.");
      if (property.ownerId === ctx.user.id) fail("BAD_REQUEST", "You can't book your own property.");
      const owner = store.users.find((u) => u.id === property.ownerId);

      const booking: Booking = {
        id: store.generateId("b"),
        propertyId: property.id,
        propertyTitle: property.title,
        propertyImage: property.images[0] ?? "",
        renterId: ctx.user.id,
        renterName: ctx.user.name,
        renterAvatar: ctx.user.avatar,
        ownerId: property.ownerId,
        ownerName: owner?.name ?? property.ownerName,
        date: input.booking.date,
        time: input.booking.time,
        status: "pending",
        notes: input.booking.notes,
        type: input.booking.type,
        createdAt: new Date().toISOString(),
      };
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
      audit(ctx, "booking.create", { targetType: "booking", targetId: booking.id, detail: property.title });
      return booking;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().max(64),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
        currentUserId: z.string().optional(),
        currentUserRole: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const idx = store.bookings.findIndex((b) => b.id === input.id);
      if (idx === -1) fail("NOT_FOUND", "Booking not found");
      const booking = store.bookings[idx];
      const isOwner = booking.ownerId === ctx.user.id;
      const isRenter = booking.renterId === ctx.user.id;
      const staff = isStaff(ctx.user);
      if (!isOwner && !isRenter && !staff) fail("FORBIDDEN", "This isn't your booking.");
      // Renters may only cancel; owners and staff manage the rest.
      if (isRenter && !isOwner && !staff && input.status !== "cancelled") {
        fail("FORBIDDEN", "Only the property owner can confirm or complete a viewing.");
      }

      store.bookings[idx] = { ...booking, status: input.status };
      const notifyIds = isOwner ? [booking.renterId] : isRenter ? [booking.ownerId] : [booking.renterId, booking.ownerId];
      for (const userId of notifyIds) {
        store.notifications.unshift({
          id: store.generateId("n"),
          userId,
          title: `Booking ${input.status.charAt(0).toUpperCase() + input.status.slice(1)}`,
          message: `The viewing for ${booking.propertyTitle} has been ${input.status}.`,
          type: "booking",
          read: false,
          createdAt: new Date().toISOString(),
          data: { bookingId: input.id },
        });
      }
      audit(ctx, `booking.${input.status}`, { targetType: "booking", targetId: booking.id, detail: booking.propertyTitle });
      return store.bookings[idx];
    }),
});
