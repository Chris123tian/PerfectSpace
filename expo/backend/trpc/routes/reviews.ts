import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { store } from "../../store";
import { Review } from "../../../types/property";

export const reviewsRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return store.reviews;
  }),

  add: publicProcedure
    .input(
      z.object({
        propertyId: z.string(),
        userId: z.string(),
        userName: z.string(),
        userAvatar: z.string(),
        rating: z.number(),
        comment: z.string(),
      })
    )
    .mutation(({ input }) => {
      console.log("[Reviews] Adding review for:", input.propertyId);
      const newReview: Review = {
        id: store.generateId("r"),
        propertyId: input.propertyId,
        userId: input.userId,
        userName: input.userName,
        userAvatar: input.userAvatar,
        rating: input.rating,
        comment: input.comment,
        date: new Date().toISOString().split("T")[0],
      };

      store.reviews.unshift(newReview);

      const propIdx = store.properties.findIndex(
        (p) => p.id === input.propertyId
      );
      if (propIdx !== -1) {
        const propReviews = store.reviews.filter(
          (r) => r.propertyId === input.propertyId
        );
        const avgRating =
          propReviews.reduce((sum, r) => sum + r.rating, 0) /
          propReviews.length;
        store.properties[propIdx].rating =
          Math.round(avgRating * 10) / 10;
        store.properties[propIdx].reviewCount = propReviews.length;
      }

      return newReview;
    }),
});
