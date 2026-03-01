import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { store } from "@/backend/store";
import { UserRole } from "@/types/property";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(({ input }) => {
      console.log("[Auth] Login attempt:", input.email);
      const found = store.users.find(
        (u) =>
          u.email.toLowerCase() === input.email.toLowerCase() &&
          u.password === input.password
      );
      if (!found) throw new Error("Invalid email or password");
      if (!found.isActive)
        throw new Error("Your account has been deactivated. Contact support.");
      console.log("[Auth] Login success:", found.name, found.role);
      return found;
    }),

  signup: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string(),
        password: z.string(),
        phone: z.string(),
        role: z.enum(["renter", "landlord", "admin"]),
      })
    )
    .mutation(({ input }) => {
      console.log("[Auth] Signup attempt:", input.email, input.role);
      const exists = store.users.find(
        (u) => u.email.toLowerCase() === input.email.toLowerCase()
      );
      if (exists) throw new Error("An account with this email already exists");

      const role: UserRole = input.role === "admin" ? "renter" : input.role;
      const newUser = {
        id: store.generateId("u"),
        name: input.name,
        email: input.email,
        password: input.password,
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face",
        phone: input.phone,
        role,
        bio:
          role === "landlord"
            ? "Property owner on Perfect Space."
            : "Looking for the perfect space.",
        propertiesCount: 0,
        reviewsCount: 0,
        rating: 0,
        memberSince: new Date().toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        verified: false,
        isActive: true,
      };

      store.users.push(newUser);
      console.log("[Auth] Signup success:", newUser.name, "Total users:", store.users.length);
      return newUser;
    }),

  getUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const user = store.users.find((u) => u.id === input.userId);
      return user ?? null;
    }),

  updateProfile: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        updates: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(({ input }) => {
      console.log("[Auth] Updating profile:", input.userId);
      const idx = store.users.findIndex((u) => u.id === input.userId);
      if (idx === -1) throw new Error("User not found");
      store.users[idx] = {
        ...store.users[idx],
        ...(input.updates as Record<string, unknown>),
        id: store.users[idx].id,
        email: store.users[idx].email,
      } as typeof store.users[0];
      return store.users[idx];
    }),

  getAllUsers: publicProcedure.query(() => {
    return store.users;
  }),

  updateUserAdmin: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        updates: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(({ input }) => {
      console.log("[Auth] Admin updating user:", input.userId);
      const idx = store.users.findIndex((u) => u.id === input.userId);
      if (idx === -1) throw new Error("User not found");
      store.users[idx] = {
        ...store.users[idx],
        ...(input.updates as Record<string, unknown>),
        id: input.userId,
      } as typeof store.users[0];
      return store.users[idx];
    }),
});
