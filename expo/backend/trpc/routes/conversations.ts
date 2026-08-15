import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { store } from "../../store";
import { Conversation, ChatMessage } from "../../../types/property";

export const conversationsRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return store.conversations;
  }),

  getMessages: publicProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(({ input }) => {
      return store.chatMessages.filter(
        (m) => m.conversationId === input.conversationId
      );
    }),

  allMessages: publicProcedure.query(() => {
    return store.chatMessages;
  }),

  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        senderId: z.string(),
        text: z.string(),
      })
    )
    .mutation(({ input }) => {
      console.log("[Chat] Sending message in:", input.conversationId);
      const newMsg: ChatMessage = {
        id: store.generateId("cm"),
        conversationId: input.conversationId,
        senderId: input.senderId,
        text: input.text,
        timestamp: new Date().toISOString(),
      };
      store.chatMessages.push(newMsg);

      const convIdx = store.conversations.findIndex(
        (c) => c.id === input.conversationId
      );
      if (convIdx !== -1) {
        store.conversations[convIdx].lastMessage = input.text;
        store.conversations[convIdx].lastMessageTime = newMsg.timestamp;
        const otherIds = store.conversations[convIdx].participantIds.filter(
          (id) => id !== input.senderId
        );
        otherIds.forEach((id) => {
          store.conversations[convIdx].unreadCount[id] =
            (store.conversations[convIdx].unreadCount[id] ?? 0) + 1;
        });
      }

      return newMsg;
    }),

  startConversation: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        userName: z.string(),
        userAvatar: z.string(),
        otherUserId: z.string(),
        otherUserName: z.string(),
        otherUserAvatar: z.string(),
        propertyId: z.string(),
        propertyTitle: z.string(),
        propertyImage: z.string(),
        initialMessage: z.string(),
      })
    )
    .mutation(({ input }) => {
      console.log("[Chat] Starting conversation with:", input.otherUserName);
      const existing = store.conversations.find(
        (c) =>
          c.participantIds.includes(input.userId) &&
          c.participantIds.includes(input.otherUserId) &&
          c.propertyId === input.propertyId
      );
      if (existing) return existing.id;

      const newConv: Conversation = {
        id: store.generateId("conv"),
        participantIds: [input.userId, input.otherUserId],
        participantNames: [input.userName, input.otherUserName],
        participantAvatars: [input.userAvatar, input.otherUserAvatar],
        propertyId: input.propertyId,
        propertyTitle: input.propertyTitle,
        propertyImage: input.propertyImage,
        lastMessage: input.initialMessage,
        lastMessageTime: new Date().toISOString(),
        unreadCount: { [input.userId]: 0, [input.otherUserId]: 1 },
      };

      const newMsg: ChatMessage = {
        id: store.generateId("cm"),
        conversationId: newConv.id,
        senderId: input.userId,
        text: input.initialMessage,
        timestamp: new Date().toISOString(),
      };

      store.conversations.unshift(newConv);
      store.chatMessages.push(newMsg);

      return newConv.id;
    }),

  markRead: publicProcedure
    .input(z.object({ conversationId: z.string(), userId: z.string() }))
    .mutation(({ input }) => {
      const idx = store.conversations.findIndex(
        (c) => c.id === input.conversationId
      );
      if (idx !== -1) {
        store.conversations[idx].unreadCount[input.userId] = 0;
      }
      return { success: true };
    }),
});
