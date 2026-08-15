import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { store } from "../../store";
import { Property } from "../../../types/property";

export const propertiesRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return store.properties;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return store.properties.find((p) => p.id === input.id) ?? null;
    }),

  add: publicProcedure
    .input(z.object({ property: z.unknown() }))
    .mutation(({ input }) => {
      const property = input.property as Property;
      console.log("[Properties] Adding:", property.title);
      store.properties.unshift(property);
      console.log("[Properties] Total:", store.properties.length);
      return property;
    }),

  update: publicProcedure
    .input(z.object({ id: z.string(), updates: z.record(z.string(), z.unknown()) }))
    .mutation(({ input }) => {
      console.log("[Properties] Updating:", input.id);
      const idx = store.properties.findIndex((p) => p.id === input.id);
      if (idx === -1) throw new Error("Property not found");
      store.properties[idx] = {
        ...store.properties[idx],
        ...(input.updates as Record<string, unknown>),
      } as Property;
      return store.properties[idx];
    }),

  approve: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      console.log("[Properties] Approving:", input.id);
      const idx = store.properties.findIndex((p) => p.id === input.id);
      if (idx === -1) throw new Error("Property not found");
      store.properties[idx].status = "active";

      const prop = store.properties[idx];
      store.notifications.unshift({
        id: store.generateId("n"),
        userId: prop.ownerId,
        title: "Property Approved",
        message: `Your property "${prop.title}" has been approved and is now live!`,
        type: "property",
        read: false,
        createdAt: new Date().toISOString(),
        data: { propertyId: input.id },
      });

      return store.properties[idx];
    }),

  reject: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      console.log("[Properties] Rejecting:", input.id);
      const idx = store.properties.findIndex((p) => p.id === input.id);
      if (idx === -1) throw new Error("Property not found");
      store.properties[idx].status = "rejected";

      const prop = store.properties[idx];
      store.notifications.unshift({
        id: store.generateId("n"),
        userId: prop.ownerId,
        title: "Property Rejected",
        message: `Your property "${prop.title}" was not approved. Please review and resubmit.`,
        type: "property",
        read: false,
        createdAt: new Date().toISOString(),
        data: { propertyId: input.id },
      });

      return store.properties[idx];
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      console.log("[Properties] Deleting:", input.id);
      store.properties = store.properties.filter((p) => p.id !== input.id);
      return { success: true };
    }),

  toggleSave: publicProcedure
    .input(z.object({ userId: z.string(), propertyId: z.string() }))
    .mutation(({ input }) => {
      if (!store.savedProperties[input.userId]) {
        store.savedProperties[input.userId] = [];
      }
      const saved = store.savedProperties[input.userId];
      const idx = saved.indexOf(input.propertyId);
      if (idx === -1) {
        saved.push(input.propertyId);
      } else {
        saved.splice(idx, 1);
      }
      return saved;
    }),

  getSaved: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return store.savedProperties[input.userId] ?? [];
    }),
});
