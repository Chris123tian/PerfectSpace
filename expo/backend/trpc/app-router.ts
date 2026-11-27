import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";
import { propertiesRouter } from "./routes/properties";
import { conversationsRouter } from "./routes/conversations";
import { bookingsRouter } from "./routes/bookings";
import { notificationsRouter } from "./routes/notifications";
import { reviewsRouter } from "./routes/reviews";
import { superadminRouter } from "./routes/superadmin";
import { paymentsRouter } from "./routes/payments";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  properties: propertiesRouter,
  conversations: conversationsRouter,
  bookings: bookingsRouter,
  notifications: notificationsRouter,
  reviews: reviewsRouter,
  superadmin: superadminRouter,
  payments: paymentsRouter,
});

export type AppRouter = typeof appRouter;
