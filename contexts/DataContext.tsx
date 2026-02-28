import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Property, Conversation, ChatMessage, Booking, AppNotification, Review, BookingStatus } from '@/types/property';
import { seedProperties, seedConversations, seedChatMessages, seedBookings, seedNotifications, seedReviews } from '@/mocks/properties';
import { useAuth } from './AuthContext';

const PROPERTIES_KEY = 'ph_properties';
const CONVERSATIONS_KEY = 'ph_conversations';
const MESSAGES_KEY = 'ph_messages';
const BOOKINGS_KEY = 'ph_bookings';
const NOTIFICATIONS_KEY = 'ph_notifications';
const REVIEWS_KEY = 'ph_reviews';
const SAVED_KEY = 'ph_saved';

async function loadOrSeed<T>(key: string, seed: T[]): Promise<T[]> {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) {
    await AsyncStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(stored);
}

async function save<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export const [DataProvider, useData] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const propertiesQuery = useQuery({
    queryKey: ['properties'],
    queryFn: () => loadOrSeed<Property>(PROPERTIES_KEY, seedProperties),
    refetchInterval: 5000,
  });

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => loadOrSeed<Conversation>(CONVERSATIONS_KEY, seedConversations),
    refetchInterval: 5000,
  });

  const messagesQuery = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => loadOrSeed<ChatMessage>(MESSAGES_KEY, seedChatMessages),
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings'],
    queryFn: () => loadOrSeed<Booking>(BOOKINGS_KEY, seedBookings),
    refetchInterval: 10000,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => loadOrSeed<AppNotification>(NOTIFICATIONS_KEY, seedNotifications),
    refetchInterval: 5000,
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews'],
    queryFn: () => loadOrSeed<Review>(REVIEWS_KEY, seedReviews),
    refetchInterval: 10000,
  });

  const savedQuery = useQuery({
    queryKey: ['savedProperties', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const stored = await AsyncStorage.getItem(`${SAVED_KEY}_${user.id}`);
      return stored ? JSON.parse(stored) as string[] : [];
    },
    enabled: !!user,
  });

  const properties = useMemo(() => propertiesQuery.data ?? [], [propertiesQuery.data]);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const chatMessages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);
  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
  const reviews = useMemo(() => reviewsQuery.data ?? [], [reviewsQuery.data]);
  const savedPropertyIds = useMemo(() => savedQuery.data ?? [], [savedQuery.data]);

  const userNotifications = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return notifications;
    return notifications.filter(n => n.userId === user.id);
  }, [notifications, user]);

  const unreadNotificationCount = useMemo(
    () => userNotifications.filter(n => !n.read).length,
    [userNotifications]
  );

  const userConversations = useMemo(() => {
    if (!user) return [];
    return conversations.filter(c => c.participantIds.includes(user.id));
  }, [conversations, user]);

  const userBookings = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return bookings;
    return bookings.filter(b => b.renterId === user.id || b.ownerId === user.id);
  }, [bookings, user]);

  const myProperties = useMemo(() => {
    if (!user) return [];
    return properties.filter(p => p.ownerId === user.id);
  }, [properties, user]);

  const activeProperties = useMemo(
    () => properties.filter(p => p.status === 'active'),
    [properties]
  );

  const addPropertyMutation = useMutation({
    mutationFn: async (property: Property) => {
      console.log('[Data] Adding property:', property.title);
      const current = await loadOrSeed<Property>(PROPERTIES_KEY, seedProperties);
      const updated = [property, ...current];
      await save(PROPERTIES_KEY, updated);
      return updated;
    },
    onSuccess: (data) => {
      console.log('[Data] Property added, updating cache with', data.length, 'properties');
      queryClient.setQueryData(['properties'], data);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Property> }) => {
      console.log('[Data] Updating property:', id);
      const current = await loadOrSeed<Property>(PROPERTIES_KEY, seedProperties);
      const idx = current.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Property not found');
      current[idx] = { ...current[idx], ...updates };
      await save(PROPERTIES_KEY, current);
      return current;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['properties'], data);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[Data] Deleting property:', id);
      const current = await loadOrSeed<Property>(PROPERTIES_KEY, seedProperties);
      const updated = current.filter(p => p.id !== id);
      await save(PROPERTIES_KEY, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['properties'], data);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  const toggleSaveMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      if (!user) throw new Error('Not authenticated');
      const key = `${SAVED_KEY}_${user.id}`;
      const stored = await AsyncStorage.getItem(key);
      const current: string[] = stored ? JSON.parse(stored) : [];
      const updated = current.includes(propertyId)
        ? current.filter(id => id !== propertyId)
        : [...current, propertyId];
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['savedProperties', user?.id], data);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[Data] Sending message in:', conversationId);

      const newMsg: ChatMessage = {
        id: 'cm_' + Date.now().toString(36),
        conversationId,
        senderId: user.id,
        text,
        timestamp: new Date().toISOString(),
      };

      const msgs = await loadOrSeed<ChatMessage>(MESSAGES_KEY, seedChatMessages);
      const updatedMsgs = [...msgs, newMsg];
      await save(MESSAGES_KEY, updatedMsgs);

      const convs = await loadOrSeed<Conversation>(CONVERSATIONS_KEY, seedConversations);
      const convIdx = convs.findIndex(c => c.id === conversationId);
      if (convIdx !== -1) {
        convs[convIdx].lastMessage = text;
        convs[convIdx].lastMessageTime = newMsg.timestamp;
        const otherIds = convs[convIdx].participantIds.filter(id => id !== user.id);
        otherIds.forEach(id => {
          convs[convIdx].unreadCount[id] = (convs[convIdx].unreadCount[id] ?? 0) + 1;
        });
        await save(CONVERSATIONS_KEY, convs);
      }

      return { messages: updatedMsgs, conversations: convs };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['chatMessages'], data.messages);
      queryClient.setQueryData(['conversations'], data.conversations);
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async ({ otherUserId, otherUserName, otherUserAvatar, propertyId, propertyTitle, propertyImage, initialMessage }: {
      otherUserId: string;
      otherUserName: string;
      otherUserAvatar: string;
      propertyId: string;
      propertyTitle: string;
      propertyImage: string;
      initialMessage: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[Data] Starting conversation with:', otherUserName);

      const convs = await loadOrSeed<Conversation>(CONVERSATIONS_KEY, seedConversations);
      const existing = convs.find(c =>
        c.participantIds.includes(user.id) &&
        c.participantIds.includes(otherUserId) &&
        c.propertyId === propertyId
      );

      if (existing) return existing.id;

      const newConv: Conversation = {
        id: 'conv_' + Date.now().toString(36),
        participantIds: [user.id, otherUserId],
        participantNames: [user.name, otherUserName],
        participantAvatars: [user.avatar, otherUserAvatar],
        propertyId,
        propertyTitle,
        propertyImage,
        lastMessage: initialMessage,
        lastMessageTime: new Date().toISOString(),
        unreadCount: { [user.id]: 0, [otherUserId]: 1 },
      };

      const newMsg: ChatMessage = {
        id: 'cm_' + Date.now().toString(36),
        conversationId: newConv.id,
        senderId: user.id,
        text: initialMessage,
        timestamp: new Date().toISOString(),
      };

      const updatedConvs = [newConv, ...convs];
      await save(CONVERSATIONS_KEY, updatedConvs);

      const msgs = await loadOrSeed<ChatMessage>(MESSAGES_KEY, seedChatMessages);
      await save(MESSAGES_KEY, [...msgs, newMsg]);

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });

      return newConv.id;
    },
  });

  const markConversationReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) return;
      const convs = await loadOrSeed<Conversation>(CONVERSATIONS_KEY, seedConversations);
      const idx = convs.findIndex(c => c.id === conversationId);
      if (idx !== -1) {
        convs[idx].unreadCount[user.id] = 0;
        await save(CONVERSATIONS_KEY, convs);
      }
      return convs;
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(['conversations'], data);
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (booking: Booking) => {
      console.log('[Data] Creating booking:', booking.propertyTitle);
      const current = await loadOrSeed<Booking>(BOOKINGS_KEY, seedBookings);
      const updated = [booking, ...current];
      await save(BOOKINGS_KEY, updated);

      const notif: AppNotification = {
        id: 'n_' + Date.now().toString(36),
        userId: booking.ownerId,
        title: 'New Viewing Request',
        message: `${booking.renterName} wants to view ${booking.propertyTitle} on ${booking.date}.`,
        type: 'booking',
        read: false,
        createdAt: new Date().toISOString(),
        data: { bookingId: booking.id },
      };
      const notifs = await loadOrSeed<AppNotification>(NOTIFICATIONS_KEY, seedNotifications);
      await save(NOTIFICATIONS_KEY, [notif, ...notifs]);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['bookings'], data);
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      console.log('[Data] Updating booking:', id, status);
      const current = await loadOrSeed<Booking>(BOOKINGS_KEY, seedBookings);
      const idx = current.findIndex(b => b.id === id);
      if (idx === -1) throw new Error('Booking not found');
      current[idx].status = status;
      await save(BOOKINGS_KEY, current);

      const booking = current[idx];
      const targetUserId = user?.role === 'landlord' ? booking.renterId : booking.ownerId;
      const notif: AppNotification = {
        id: 'n_' + Date.now().toString(36),
        userId: targetUserId,
        title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your viewing for ${booking.propertyTitle} has been ${status}.`,
        type: 'booking',
        read: false,
        createdAt: new Date().toISOString(),
        data: { bookingId: id },
      };
      const notifs = await loadOrSeed<AppNotification>(NOTIFICATIONS_KEY, seedNotifications);
      await save(NOTIFICATIONS_KEY, [notif, ...notifs]);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      return current;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['bookings'], data);
    },
  });

  const addReviewMutation = useMutation({
    mutationFn: async ({ propertyId, rating, comment }: { propertyId: string; rating: number; comment: string }) => {
      if (!user) throw new Error('Not authenticated');
      console.log('[Data] Adding review for:', propertyId);

      const newReview: Review = {
        id: 'r_' + Date.now().toString(36),
        propertyId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating,
        comment,
        date: new Date().toISOString().split('T')[0],
      };

      const current = await loadOrSeed<Review>(REVIEWS_KEY, seedReviews);
      const updated = [newReview, ...current];
      await save(REVIEWS_KEY, updated);

      const props = await loadOrSeed<Property>(PROPERTIES_KEY, seedProperties);
      const propIdx = props.findIndex(p => p.id === propertyId);
      if (propIdx !== -1) {
        const propReviews = updated.filter(r => r.propertyId === propertyId);
        const avgRating = propReviews.reduce((sum, r) => sum + r.rating, 0) / propReviews.length;
        props[propIdx].rating = Math.round(avgRating * 10) / 10;
        props[propIdx].reviewCount = propReviews.length;
        await save(PROPERTIES_KEY, props);
        queryClient.setQueryData(['properties'], [...props]);
      }

      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['reviews'], data);
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const current = await loadOrSeed<AppNotification>(NOTIFICATIONS_KEY, seedNotifications);
      const idx = current.findIndex(n => n.id === id);
      if (idx !== -1) {
        current[idx].read = true;
        await save(NOTIFICATIONS_KEY, current);
      }
      return current;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notifications'], data);
    },
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return [];
      const current = await loadOrSeed<AppNotification>(NOTIFICATIONS_KEY, seedNotifications);
      const updated = current.map(n =>
        (user.role === 'admin' || n.userId === user.id) ? { ...n, read: true } : n
      );
      await save(NOTIFICATIONS_KEY, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notifications'], data);
    },
  });

  const getConversationMessages = useCallback((conversationId: string): ChatMessage[] => {
    return chatMessages.filter(m => m.conversationId === conversationId);
  }, [chatMessages]);

  const getPropertyReviews = useCallback((propertyId: string): Review[] => {
    return reviews.filter(r => r.propertyId === propertyId);
  }, [reviews]);

  const isSaved = useCallback((propertyId: string): boolean => {
    return savedPropertyIds.includes(propertyId);
  }, [savedPropertyIds]);

  return {
    properties,
    activeProperties,
    myProperties,
    addProperty: addPropertyMutation.mutateAsync,
    updateProperty: updatePropertyMutation.mutateAsync,
    deleteProperty: deletePropertyMutation.mutateAsync,
    conversations: userConversations,
    allConversations: conversations,
    getConversationMessages,
    sendMessage: sendMessageMutation.mutateAsync,
    startConversation: startConversationMutation.mutateAsync,
    markConversationRead: markConversationReadMutation.mutate,
    bookings: userBookings,
    allBookings: bookings,
    createBooking: createBookingMutation.mutateAsync,
    updateBooking: updateBookingMutation.mutateAsync,
    notifications: userNotifications,
    allNotifications: notifications,
    unreadNotificationCount,
    markNotificationRead: markNotificationReadMutation.mutate,
    markAllNotificationsRead: markAllNotificationsReadMutation.mutate,
    reviews,
    getPropertyReviews,
    addReview: addReviewMutation.mutateAsync,
    savedPropertyIds,
    toggleSave: toggleSaveMutation.mutateAsync,
    isSaved,
    isLoading: propertiesQuery.isLoading,
  };
});
