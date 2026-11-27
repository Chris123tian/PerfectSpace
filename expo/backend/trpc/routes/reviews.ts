import * as z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../create-context";
import { store } from "../../store";
import { audit, fail } from "../helpers";
import type { Review } from "../../../types/property";

export const reviewsRouter = createTRPCRouter({
  list: publicProcedure.query(() => store.reviews),

  add: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().max(64),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().min(1).max(2000),
        userId: z.string().optional(),
        userName: z.string().optional(),
        userAvatar: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const propIdx = store.properties.findIndex((p) => p.id === input.propertyId);
      if (propIdx === -1) fail("NOT_FOUND", "Property not found");
      if (store.properties[propIdx].ownerId === ctx.user.id) fail("BAD_REQUEST", "You can't review your own property.");

      const newReview: Review = {
        id: store.generateId("r"),
        propertyId: input.propertyId,
        userId: ctx.user.id,
        userName: ctx.user.name,
        userAvatar: ctx.user.avatar,
        rating: input.rating,
        comment: input.comment,
        date: new Date().toISOString().split("T")[0],
      };
      store.reviews.unshift(newReview);

      const propReviews = store.reviews.filter((r) => r.propertyId === input.propertyId);
      const avg = propReviews.reduce((sum, r) => sum + r.rating, 0) / propReviews.length;
      store.properties[propIdx] = {
        ...store.properties[propIdx],
        rating: Math.round(avg * 10) / 10,
        reviewCount: propReviews.length,
      };
      audit(ctx, "review.add", { targetType: "review", targetId: newReview.id, detail: `property=${input.propertyId}` });
      return newReview;
    }),
});
