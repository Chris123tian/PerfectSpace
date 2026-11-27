import * as z from "zod";
import { createTRPCRouter, isStaff, protectedProcedure } from "../create-context";
import { store } from "../../store";
import { audit, fail } from "../helpers";
import type { ChatMessage, Conversation, User } from "../../../types/property";

const SUPPORT = "support";

/** Participants see their chats; staff additionally see every support chat. */
function canAccess(user: User, conv: Conversation) {
  return conv.participantIds.includes(user.id) || (isStaff(user) && conv.propertyId === SUPPORT);
}

function visibleConversations(user: User) {
  return store.conversations.filter((c) => canAccess(user, c));
}

function findConversation(user: User, id: string) {
  const idx = store.conversations.findIndex((c) => c.id === id);
  if (idx === -1 || !canAccess(user, store.conversations[idx])) fail("NOT_FOUND", "Conversation not found");
  return idx;
}

const message = z.string().trim().min(1, "Message is empty").max(4000);

export const conversationsRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) => visibleConversations(ctx.user)),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string().max(64) }))
    .query(({ input, ctx }) => {
      findConversation(ctx.user, input.conversationId);
      return store.chatMessages.filter((m) => m.conversationId === input.conversationId);
    }),

  allMessages: protectedProcedure.query(({ ctx }) => {
    const ids = new Set(visibleConversations(ctx.user).map((c) => c.id));
    return store.chatMessages.filter((m) => ids.has(m.conversationId));
  }),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.string().max(64), senderId: z.string().optional(), text: message }))
    .mutation(({ input, ctx }) => {
      const convIdx = findConversation(ctx.user, input.conversationId);
      const newMsg: ChatMessage = {
        id: store.generateId("cm"),
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        text: input.text,
        timestamp: new Date().toISOString(),
      };
      store.chatMessages.push(newMsg);

      const conv = store.conversations[convIdx];
      const unread = { ...conv.unreadCount };
      for (const id of conv.participantIds) {
        if (id !== ctx.user.id) unread[id] = (unread[id] ?? 0) + 1;
      }
      // A staff reply in a support chat clears the staff inbox counter.
      if (isStaff(ctx.user) && conv.propertyId === SUPPORT) {
        for (const id of conv.participantIds) {
          const u = store.users.find((x) => x.id === id);
          if (isStaff(u)) unread[id] = 0;
        }
      }
      store.conversations[convIdx] = {
        ...conv,
        lastMessage: input.text,
        lastMessageTime: newMsg.timestamp,
        unreadCount: unread,
      };
      return newMsg;
    }),

  startConversation: protectedProcedure
    .input(
      z.object({
        otherUserId: z.string().max(64),
        propertyId: z.string().max(64),
        initialMessage: message,
        // Legacy fields — ignored; names/avatars come from the server.
        userId: z.string().optional(),
        userName: z.string().optional(),
        userAvatar: z.string().optional(),
        otherUserName: z.string().optional(),
        otherUserAvatar: z.string().optional(),
        propertyTitle: z.string().optional(),
        propertyImage: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const me = ctx.user;
      if (input.otherUserId === me.id) fail("BAD_REQUEST", "You can't message yourself.");
      const other = store.users.find((u) => u.id === input.otherUserId && u.isActive);
      if (!other) fail("NOT_FOUND", "That member is no longer available.");
      const property = store.properties.find((p) => p.id === input.propertyId);
      if (!property) fail("NOT_FOUND", "Property not found");

      const existing = store.conversations.find(
        (c) => c.participantIds.includes(me.id) && c.participantIds.includes(other.id) && c.propertyId === property.id
      );
      if (existing) return existing.id;

      const now = new Date().toISOString();
      const newConv: Conversation = {
        id: store.generateId("conv"),
        participantIds: [me.id, other.id],
        participantNames: [me.name, other.name],
        participantAvatars: [me.avatar, other.avatar],
        propertyId: property.id,
        propertyTitle: property.title,
        propertyImage: property.images[0] ?? "",
        lastMessage: input.initialMessage,
        lastMessageTime: now,
        unreadCount: { [me.id]: 0, [other.id]: 1 },
      };
      store.conversations.unshift(newConv);
      store.chatMessages.push({
        id: store.generateId("cm"),
        conversationId: newConv.id,
        senderId: me.id,
        text: input.initialMessage,
        timestamp: now,
      });
      return newConv.id;
    }),

  startSupportConversation: protectedProcedure
    .input(
      z.object({
        initialMessage: message,
        userId: z.string().optional(),
        userName: z.string().optional(),
        userAvatar: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) => {
      const me = ctx.user;
      const admin =
        store.users.find((u) => u.role === "admin" && u.isActive) ??
        store.users.find((u) => u.role === "superadmin" && u.isActive);
      if (!admin) fail("PRECONDITION_FAILED", "Support is unavailable right now. Try again later.");

      const existing = store.conversations.find(
        (c) => c.propertyId === SUPPORT && c.participantIds[0] === me.id
      );
      if (existing) return existing.id;

      const now = new Date().toISOString();
      const newConv: Conversation = {
        id: store.generateId("conv"),
        participantIds: [me.id, admin.id],
        participantNames: [me.name, "Perfect Space Support"],
        participantAvatars: [me.avatar, admin.avatar],
        propertyId: SUPPORT,
        propertyTitle: "Customer Support",
        propertyImage: "",
        lastMessage: input.initialMessage,
        lastMessageTime: now,
        unreadCount: { [me.id]: 0, [admin.id]: 1 },
      };
      store.conversations.unshift(newConv);
      store.chatMessages.push({
        id: store.generateId("cm"),
        conversationId: newConv.id,
        senderId: me.id,
        text: input.initialMessage,
        timestamp: now,
      });
      audit(ctx, "support.open", { targetType: "conversation", targetId: newConv.id });
      return newConv.id;
    }),

  markRead: protectedProcedure
    .input(z.object({ conversationId: z.string().max(64), userId: z.string().optional() }))
    .mutation(({ input, ctx }) => {
      const idx = findConversation(ctx.user, input.conversationId);
      const conv = store.conversations[idx];
      const unread = { ...conv.unreadCount, [ctx.user.id]: 0 };
      if (isStaff(ctx.user) && conv.propertyId === SUPPORT) {
        for (const id of conv.participantIds) {
          if (isStaff(store.users.find((u) => u.id === id))) unread[id] = 0;
        }
      }
      store.conversations[idx] = { ...conv, unreadCount: unread };
      return { success: true };
    }),
});
