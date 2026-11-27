import * as z from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  isStaff,
  protectedProcedure,
  publicProcedure,
} from "../create-context";
import { store, ADMINS_INBOX } from "../../store";
import { audit, fail } from "../helpers";
import type { Property, User } from "../../../types/property";

const text = (max: number) => z.string().trim().max(max);

/** Stored photos must be hosted URLs — never device-local blob:/file: URIs. */
const imageUrl = z
  .string()
  .max(600)
  .refine((u) => /^https:\/\//.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)/.test(u), {
    message: "A photo hasn't finished uploading. Wait for every photo to upload, then save again.",
  });

const propertyFields = z.object({
  title: text(120).min(3, "Title is too short"),
  description: text(5000),
  type: z.enum(["apartment", "office", "hostel", "room", "hotel"]),
  listingType: z.enum(["rent", "sale"]),
  price: z.number().min(0).max(1e11),
  currency: text(8),
  period: text(20).optional(),
  durationUnit: z.enum(["month", "year", "night"]).optional(),
  minNights: z.number().int().min(1).max(365).optional(),
  country: text(80).optional(),
  contactEmail: text(254).optional(),
  contactWhatsApp: text(32).optional(),
  bookingChannel: z.enum(["in_app", "whatsapp"]).optional(),
  bedrooms: z.number().int().min(0).max(500),
  bathrooms: z.number().int().min(0).max(500),
  area: z.number().min(0).max(1e8),
  address: text(300),
  city: text(100).min(1, "Town / city is required"),
  region: text(100).optional(),
  neighborhood: text(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  images: z.array(imageUrl).max(20),
  amenities: z.array(text(60)).max(60),
});

function canManage(user: Pick<User, "id" | "role">, property: Property) {
  return property.ownerId === user.id || isStaff(user);
}

function findPropertyIndex(id: string) {
  const idx = store.properties.findIndex((p) => p.id === id);
  if (idx === -1) fail("NOT_FOUND", "Property not found");
  return idx;
}

function notify(userId: string, title: string, message: string, propertyId: string) {
  store.notifications.unshift({
    id: store.generateId("n"),
    userId,
    title,
    message,
    type: "property",
    read: false,
    createdAt: new Date().toISOString(),
    data: { propertyId },
  });
}

export const propertiesRouter = createTRPCRouter({
  /** Live listings for everyone; owners also get their own drafts; staff get all. */
  list: publicProcedure.query(({ ctx }) => {
    if (isStaff(ctx.user)) return store.properties;
    const me = ctx.user?.id;
    return store.properties.filter((p) => p.status === "active" || (me && p.ownerId === me));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().max(64) }))
    .query(({ input, ctx }) => {
      const p = store.properties.find((x) => x.id === input.id);
      if (!p) return null;
      if (p.status === "active" || (ctx.user && canManage(ctx.user, p))) return p;
      return null;
    }),

  add: protectedProcedure
    .input(z.object({ property: propertyFields }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "landlord" && !isStaff(ctx.user)) {
        fail("FORBIDDEN", "Only landlord accounts can list properties.");
      }
      const property: Property = {
        ...input.property,
        id: store.generateId("p"),
        ownerId: ctx.user.id,
        ownerName: ctx.user.name,
        ownerAvatar: ctx.user.avatar,
        rating: 0,
        reviewCount: 0,
        featured: false,
        status: isStaff(ctx.user) ? "active" : "pending",
        createdAt: new Date().toISOString(),
      };
      store.properties.unshift(property);
      if (property.status === "pending") {
        notify(ADMINS_INBOX, "New Listing Pending", `${ctx.user.name} submitted "${property.title}" for review.`, property.id);
      }
      audit(ctx, "property.add", { targetType: "property", targetId: property.id, detail: property.title });
      return property;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().max(64),
        updates: propertyFields
          .partial()
          .extend({
            status: z.enum(["active", "pending", "rejected", "archived"]).optional(),
            featured: z.boolean().optional(),
          }),
      })
    )
    .mutation(({ input, ctx }) => {
      const idx = findPropertyIndex(input.id);
      const current = store.properties[idx];
      if (!canManage(ctx.user, current)) fail("FORBIDDEN", "You can only edit your own listings.");

      const updates = Object.fromEntries(
        Object.entries(input.updates).filter(([, v]) => v !== undefined)
      ) as typeof input.updates;
      if (!isStaff(ctx.user)) {
        delete updates.featured;
        // Owners may archive/unarchive; only staff can publish or reject.
        if (updates.status && updates.status !== "archived" && !(updates.status === "pending" && current.status === "archived")) {
          delete updates.status;
        }
      }
      store.properties[idx] = { ...current, ...updates };
      audit(ctx, "property.update", {
        targetType: "property",
        targetId: current.id,
        detail: `fields=${Object.keys(updates).join(",")}`,
      });
      return store.properties[idx];
    }),

  approve: adminProcedure
    .input(z.object({ id: z.string().max(64) }))
    .mutation(({ input, ctx }) => {
      const idx = findPropertyIndex(input.id);
      store.properties[idx] = { ...store.properties[idx], status: "active" };
      const prop = store.properties[idx];
      notify(prop.ownerId, "Property Approved", `Your property "${prop.title}" has been approved and is now live!`, prop.id);
      audit(ctx, "property.approve", { targetType: "property", targetId: prop.id, detail: prop.title });
      return prop;
    }),

  reject: adminProcedure
    .input(z.object({ id: z.string().max(64) }))
    .mutation(({ input, ctx }) => {
      const idx = findPropertyIndex(input.id);
      store.properties[idx] = { ...store.properties[idx], status: "rejected" };
      const prop = store.properties[idx];
      notify(prop.ownerId, "Property Rejected", `Your property "${prop.title}" was not approved. Please review and resubmit.`, prop.id);
      audit(ctx, "property.reject", { targetType: "property", targetId: prop.id, detail: prop.title });
      return prop;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().max(64) }))
    .mutation(({ input, ctx }) => {
      const idx = findPropertyIndex(input.id);
      const prop = store.properties[idx];
      if (!canManage(ctx.user, prop)) fail("FORBIDDEN", "You can only delete your own listings.");
      store.properties = store.properties.filter((p) => p.id !== input.id);
      for (const uid of Object.keys(store.savedProperties)) {
        const list = store.savedProperties[uid];
        if (list.includes(input.id)) store.savedProperties[uid] = list.filter((id) => id !== input.id);
      }
      audit(ctx, "property.delete", { targetType: "property", targetId: prop.id, detail: prop.title });
      return { success: true };
    }),

  toggleSave: protectedProcedure
    .input(z.object({ userId: z.string().optional(), propertyId: z.string().max(64) }))
    .mutation(({ input, ctx }) => {
      const uid = ctx.user.id;
      const saved = [...(store.savedProperties[uid] ?? [])];
      const idx = saved.indexOf(input.propertyId);
      if (idx === -1) saved.push(input.propertyId);
      else saved.splice(idx, 1);
      store.savedProperties[uid] = saved;
      return saved;
    }),

  getSaved: protectedProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .query(({ ctx }) => store.savedProperties[ctx.user.id] ?? []),
});
