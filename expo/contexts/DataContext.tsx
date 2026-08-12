import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Property, Conversation, ChatMessage, Booking, AppNotification, Review, BookingStatus, PropertyFilter } from '@/types/property';
import { useAuth } from './AuthContext';
import { trpc } from '@/lib/trpc';

export const [DataProvider, useData] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Global filter state shared across screens
  const [filters, setFilters] = useState<PropertyFilter>({});

  const propertiesQuery = trpc.properties.list.useQuery(undefined, {
    refetchInterval: 3000,
    staleTime: 1000,
  });

  const conversationsQuery = trpc.conversations.list.useQuery(undefined, {
    refetchInterval: 3000,
    staleTime: 1000,
  });

  const messagesQuery = trpc.conversations.allMessages.useQuery(undefined, {
    refetchInterval: 3000,
    staleTime: 1000,
  });

  const bookingsQuery = trpc.bookings.list.useQuery(undefined, {
    refetchInterval: 3000,
    staleTime: 1000,
  });

  const notificationsQuery = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 3000,
    staleTime: 1000,
  });

  const reviewsQuery = trpc.reviews.list.useQuery(undefined, {
    refetchInterval: 5000,
    staleTime: 2000,
  });

  const userId = user?.id;
  const savedQuery = trpc.properties.getSaved.useQuery(
    { userId: userId ?? '' },
    {
      enabled: !!userId,
      refetchInterval: 5000,
    }
  );

  const properties = useMemo(() => (propertiesQuery.data ?? []) as Property[], [propertiesQuery.data]);
  const conversations = useMemo(() => (conversationsQuery.data ?? []) as Conversation[], [conversationsQuery.data]);
  const chatMessages = useMemo(() => (messagesQuery.data ?? []) as ChatMessage[], [messagesQuery.data]);
  const bookings = useMemo(() => (bookingsQuery.data ?? []) as Booking[], [bookingsQuery.data]);
  const notifications = useMemo(() => (notificationsQuery.data ?? []) as AppNotification[], [notificationsQuery.data]);
  const reviews = useMemo(() => (reviewsQuery.data ?? []) as Review[], [reviewsQuery.data]);
  const savedPropertyIds = useMemo(() => (savedQuery.data ?? []) as string[], [savedQuery.data]);

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

  /** Active properties with global filters applied */
  const filteredActiveProperties = useMemo(() => {
    let result = activeProperties;

    if (filters.country && filters.country !== 'Any') {
      result = result.filter(p => p.country === filters.country);
    }
    if (filters.city && filters.city !== 'Any') {
      result = result.filter(p => p.city === filters.city);
    }
    if (filters.type) {
      result = result.filter(p => p.type === filters.type);
    }
    if (filters.listingType) {
      result = result.filter(p => p.listingType === filters.listingType);
    }
    if (filters.minPrice !== undefined) {
      result = result.filter(p => p.price >= (filters.minPrice ?? 0));
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== Infinity) {
      result = result.filter(p => p.price <= (filters.maxPrice ?? Infinity));
    }
    if (filters.bedrooms !== undefined && filters.bedrooms > 0) {
      result = result.filter(p => p.bedrooms >= (filters.bedrooms ?? 0));
    }
    if (filters.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeProperties, filters]);

  const pendingProperties = useMemo(
    () => properties.filter(p => p.status === 'pending'),
    [properties]
  );

  const updateFilters = useCallback((newFilters: Partial<PropertyFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.country && filters.country !== 'Any') count++;
    if (filters.city && filters.city !== 'Any') count++;
    if (filters.type) count++;
    if (filters.listingType) count++;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
    if (filters.bedrooms !== undefined && filters.bedrooms > 0) count++;
    return count;
  }, [filters]);

  const addPropertyMutation = trpc.properties.add.useMutation({
    onSuccess: () => {
      console.log('[Data] Property added via backend');
      void queryClient.invalidateQueries({ queryKey: [['properties', 'list']] });
    },
  });

  const updatePropertyMutation = trpc.properties.update.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['properties', 'list']] });
    },
  });

  const approvePropertyMutation = trpc.properties.approve.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['properties', 'list']] });
      void queryClient.invalidateQueries({ queryKey: [['notifications', 'list']] });
    },
  });

  const rejectPropertyMutation = trpc.properties.reject.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['properties', 'list']] });
      void queryClient.invalidateQueries({ queryKey: [['notifications', 'list']] });
    },
  });

  const deletePropertyMutation = trpc.properties.delete.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['properties', 'list']] });
    },
  });

  const toggleSaveMutation = trpc.properties.toggleSave.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['properties', 'getSaved']] });
    },
  });

  const sendMessageMutation = trpc.conversations.sendMessage.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['conversations', 'allMessages']] });
      void queryClient.invalidateQueries({ queryKey: [['conversations', 'list']] });
    },
  });

  const startConversationMutation = trpc.conversations.startConversation.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['conversations', 'list']] });
      void queryClient.invalidateQueries({ queryKey: [['conversations', 'allMessages']] });
    },
  });

  const markConversationReadMutation = trpc.conversations.markRead.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['conversations', 'list']] });
    },
  });

  const createBookingMutation = trpc.bookings.create.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['bookings', 'list']] });
      void queryClient.invalidateQueries({ queryKey: [['notifications', 'list']] });
    },
  });

  const updateBookingMutation = trpc.bookings.updateStatus.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['bookings', 'list']] });
      void queryClient.invalidateQueries({ queryKey: [['notifications', 'list']] });
    },
  });

  const addReviewMutation = trpc.reviews.add.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['reviews', 'list']] });
      void queryClient.invalidateQueries({ queryKey: [['properties', 'list']] });
    },
  });

  const markNotificationReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['notifications', 'list']] });
    },
  });

  const markAllNotificationsReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [['notifications', 'list']] });
    },
  });

  const addProperty = useCallback(async (property: Property) => {
    return addPropertyMutation.mutateAsync({ property: property as unknown });
  }, [addPropertyMutation]);

  const updateProperty = useCallback(async ({ id, updates }: { id: string; updates: Partial<Property> }) => {
    return updatePropertyMutation.mutateAsync({ id, updates: updates as Record<string, unknown> });
  }, [updatePropertyMutation]);

  const approveProperty = useCallback(async (id: string) => {
    return approvePropertyMutation.mutateAsync({ id });
  }, [approvePropertyMutation]);

  const rejectProperty = useCallback(async (id: string) => {
    return rejectPropertyMutation.mutateAsync({ id });
  }, [rejectPropertyMutation]);

  const deleteProperty = useCallback(async (id: string) => {
    return deletePropertyMutation.mutateAsync({ id });
  }, [deletePropertyMutation]);

  const toggleSave = useCallback(async (propertyId: string) => {
    if (!user) throw new Error('Not authenticated');
    return toggleSaveMutation.mutateAsync({ userId: user.id, propertyId });
  }, [user, toggleSaveMutation]);

  const sendMessage = useCallback(async ({ conversationId, text }: { conversationId: string; text: string }) => {
    if (!user) throw new Error('Not authenticated');
    return sendMessageMutation.mutateAsync({ conversationId, senderId: user.id, text });
  }, [user, sendMessageMutation]);

  const startConversation = useCallback(async ({ otherUserId, otherUserName, otherUserAvatar, propertyId, propertyTitle, propertyImage, initialMessage }: {
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar: string;
    propertyId: string;
    propertyTitle: string;
    propertyImage: string;
    initialMessage: string;
  }) => {
    if (!user) throw new Error('Not authenticated');
    return startConversationMutation.mutateAsync({
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      otherUserId,
      otherUserName,
      otherUserAvatar,
      propertyId,
      propertyTitle,
      propertyImage,
      initialMessage,
    });
  }, [user, startConversationMutation]);

  const markConversationRead = useCallback((conversationId: string) => {
    if (!user) return;
    markConversationReadMutation.mutate({ conversationId, userId: user.id });
  }, [user, markConversationReadMutation]);

  const createBooking = useCallback(async (booking: Booking) => {
    return createBookingMutation.mutateAsync({ booking: booking as unknown });
  }, [createBookingMutation]);

  const updateBooking = useCallback(async ({ id, status }: { id: string; status: BookingStatus }) => {
    if (!user) throw new Error('Not authenticated');
    return updateBookingMutation.mutateAsync({
      id,
      status,
      currentUserId: user.id,
      currentUserRole: user.role,
    });
  }, [user, updateBookingMutation]);

  const addReview = useCallback(async ({ propertyId, rating, comment }: { propertyId: string; rating: number; comment: string }) => {
    if (!user) throw new Error('Not authenticated');
    return addReviewMutation.mutateAsync({
      propertyId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      rating,
      comment,
    });
  }, [user, addReviewMutation]);

  const markNotificationRead = useCallback((id: string) => {
    markNotificationReadMutation.mutate({ id });
  }, [markNotificationReadMutation]);

  const markAllNotificationsRead = useCallback(() => {
    if (!user) return;
    markAllNotificationsReadMutation.mutate({ userId: user.id, role: user.role });
  }, [user, markAllNotificationsReadMutation]);

  const getConversationMessages = useCallback((conversationId: string): ChatMessage[] => {
    return chatMessages.filter(m => m.conversationId === conversationId);
  }, [chatMessages]);

  const getPropertyReviews = useCallback((propertyId: string): Review[] => {
    return reviews.filter(r => r.propertyId === propertyId);
  }, [reviews]);

  const isSaved = useCallback((propertyId: string): boolean => {
    return savedPropertyIds.includes(propertyId);
  }, [savedPropertyIds]);

  return useMemo(() => ({
    properties,
    activeProperties,
    filteredActiveProperties,
    pendingProperties,
    myProperties,
    approveProperty,
    rejectProperty,
    addProperty,
    updateProperty,
    deleteProperty,
    conversations: userConversations,
    allConversations: conversations,
    getConversationMessages,
    sendMessage,
    startConversation,
    markConversationRead,
    bookings: userBookings,
    allBookings: bookings,
    createBooking,
    updateBooking,
    notifications: userNotifications,
    allNotifications: notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    reviews,
    getPropertyReviews,
    addReview,
    savedPropertyIds,
    toggleSave,
    isSaved,
    isLoading: propertiesQuery.isLoading,
    // Filter state
    filters,
    updateFilters,
    resetFilters,
    activeFilterCount,
  }), [
    properties, activeProperties, filteredActiveProperties, pendingProperties, myProperties,
    approveProperty, rejectProperty, addProperty, updateProperty, deleteProperty,
    userConversations, conversations, getConversationMessages, sendMessage, startConversation, markConversationRead,
    userBookings, bookings, createBooking, updateBooking,
    userNotifications, notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead,
    reviews, getPropertyReviews, addReview, savedPropertyIds, toggleSave, isSaved, propertiesQuery.isLoading,
    filters, updateFilters, resetFilters, activeFilterCount,
  ]);
});
