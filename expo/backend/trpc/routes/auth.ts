import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { store } from "../../store";
import { UserRole, UserVerification } from "../../../types/property";

// Never send password hashes/secrets back to the client.
function sanitizeUser<T extends { password?: string }>(user: T): Omit<T, "password"> {
  if (!user) return user;
  const { password: _password, ...safe } = user;
  return safe as Omit<T, "password">;
}

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
      return sanitizeUser(found);
    }),

  signup: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string(),
        password: z.string(),
        phone: z.string(),
        role: z.enum(["renter", "landlord", "admin"]),
        dob: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional(),
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
        dob: input.dob,
        country: input.country,
        region: input.region,
      };

      store.users.push(newUser);
      console.log("[Auth] Signup success:", newUser.name, "Total users:", store.users.length);
      return sanitizeUser(newUser);
    }),

  googleAuth: publicProcedure
    .input(
      z.object({
        email: z.string(),
        name: z.string(),
        avatar: z.string().optional(),
        role: z.enum(["renter", "landlord"]).optional(),
      })
    )
    .mutation(({ input }) => {
      console.log("[Auth] Google auth attempt:", input.email);
      const existing = store.users.find(
        (u) => u.email.toLowerCase() === input.email.toLowerCase()
      );

      if (existing) {
        if (!existing.isActive)
          throw new Error("Your account has been deactivated. Contact support.");
        console.log("[Auth] Google login existing user:", existing.name);
        if (input.avatar && input.avatar !== existing.avatar) {
          const idx = store.users.findIndex((u) => u.id === existing.id);
          if (idx !== -1) {
            store.users[idx] = { ...store.users[idx], avatar: input.avatar };
          }
        }
        return sanitizeUser(existing);
      }

      const role: UserRole = input.role ?? "renter";
      const newUser = {
        id: store.generateId("u"),
        name: input.name,
        email: input.email,
        password: "google_oauth_" + Date.now().toString(36),
        avatar:
          input.avatar ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face",
        phone: "",
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
        verified: true,
        isActive: true,
      };

      store.users.push(newUser);
      console.log("[Auth] Google signup success:", newUser.name, "Total users:", store.users.length);
      return sanitizeUser(newUser);
    }),

  getUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const user = store.users.find((u) => u.id === input.userId);
      return user ? sanitizeUser(user) : null;
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
      return sanitizeUser(store.users[idx]);
    }),

  getAllUsers: publicProcedure.query(() => {
    return store.users.map(sanitizeUser);
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
      return sanitizeUser(store.users[idx]);
    }),

  changePassword: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        currentPassword: z.string(),
        newPassword: z.string(),
      })
    )
    .mutation(({ input }) => {
      console.log("[Auth] Password change for:", input.userId);
      const idx = store.users.findIndex((u) => u.id === input.userId);
      if (idx === -1) throw new Error("User not found");
      const user = store.users[idx];
      if ((user.password ?? "") !== input.currentPassword) {
        throw new Error("Current password is incorrect");
      }
      if (input.newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters");
      }
      store.users[idx] = { ...user, password: input.newPassword };
      return { success: true };
    }),

  submitVerification: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        documentType: z.string(),
        documentName: z.string(),
        documentNumber: z.string().optional(),
        documentImage: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      console.log("[Auth] Verification submitted by:", input.userId);
      const idx = store.users.findIndex((u) => u.id === input.userId);
      if (idx === -1) throw new Error("User not found");
      const user = store.users[idx];

      // Auto-approve when the name on the document matches the account name.
      const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const nameMatches =
        normalized(input.documentName) === normalized(user.name) &&
        input.documentName.trim().length > 2;
      const status = nameMatches ? "approved" : "pending";

      const verification = {
        status: status as "approved" | "pending",
        documentType: input.documentType,
        documentName: input.documentName,
        documentNumber: input.documentNumber,
        documentImage: input.documentImage,
        submittedAt: new Date().toISOString(),
        reviewedAt: nameMatches ? new Date().toISOString() : undefined,
      };

      store.users[idx] = {
        ...user,
        verification,
        verified: nameMatches ? true : user.verified,
      };

      if (!nameMatches) {
        store.notifications.unshift({
          id: store.generateId("n"),
          userId: "admin1",
          title: "Verification Request",
          message: `${user.name} submitted a ${input.documentType} for verification.`,
          type: "system",
          read: false,
          createdAt: new Date().toISOString(),
          data: { userId: user.id },
        });
      }

      return store.users[idx];
    }),

  reviewVerification: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        approve: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      console.log("[Auth] Verification review for:", input.userId, input.approve);
      const idx = store.users.findIndex((u) => u.id === input.userId);
      if (idx === -1) throw new Error("User not found");
      const user = store.users[idx];
      const verification = {
        ...(user.verification ?? { status: "pending" }),
        status: (input.approve ? "approved" : "rejected") as "approved" | "rejected" | "pending",
        reviewedAt: new Date().toISOString(),
        rejectionReason: input.approve ? undefined : input.reason,
      } as UserVerification;
      store.users[idx] = {
        ...user,
        verification,
        verified: input.approve ? true : false,
      };

      store.notifications.unshift({
        id: store.generateId("n"),
        userId: input.userId,
        title: input.approve ? "Identity Verified" : "Verification Rejected",
        message: input.approve
          ? "Your identity document was approved. You are now a verified member!"
          : `Your verification was not approved.${input.reason ? ` Reason: ${input.reason}` : ""} You can resubmit with a clearer document.`,
        type: "system",
        read: false,
        createdAt: new Date().toISOString(),
      });

      return store.users[idx];
    }),

  getSettings: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return store.userSettings[input.userId] ?? {
        pushEnabled: true,
        emailEnabled: true,
        darkMode: false,
      };
    }),

  updateSettings: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        settings: z.object({
          pushEnabled: z.boolean().optional(),
          emailEnabled: z.boolean().optional(),
          darkMode: z.boolean().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      console.log("[Auth] Updating settings for:", input.userId);
      const existing = store.userSettings[input.userId] ?? {
        pushEnabled: true,
        emailEnabled: true,
        darkMode: false,
      };
      store.userSettings[input.userId] = {
        ...existing,
        ...input.settings,
      };
      return store.userSettings[input.userId];
    }),

  deleteAccount: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(({ input }) => {
      console.log("[Auth] Deleting account:", input.userId);
      store.users = store.users.filter((u) => u.id !== input.userId);
      store.properties = store.properties.filter((p) => p.ownerId !== input.userId);
      store.conversations = store.conversations.filter(
        (c) => !c.participantIds.includes(input.userId)
      );
      store.bookings = store.bookings.filter(
        (b) => b.renterId !== input.userId && b.ownerId !== input.userId
      );
      store.notifications = store.notifications.filter((n) => n.userId !== input.userId);
      delete store.savedProperties[input.userId];
      delete store.userSettings[input.userId];
      return { success: true };
    }),
});
