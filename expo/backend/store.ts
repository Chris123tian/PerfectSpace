import {
  Property,
  User,
  Conversation,
  ChatMessage,
  Booking,
  AppNotification,
  Review,
} from "@/types/property";

import {
  seedUsers,
  seedProperties,
  seedConversations,
  seedChatMessages,
  seedReviews,
  seedBookings,
  seedNotifications,
} from "../mocks/properties";

interface UserSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  darkMode: boolean;
}

class Store {
  users: User[] = [...seedUsers];
  properties: Property[] = [...seedProperties];
  conversations: Conversation[] = [...seedConversations];
  chatMessages: ChatMessage[] = [...seedChatMessages];
  bookings: Booking[] = [...seedBookings];
  notifications: AppNotification[] = [...seedNotifications];
  reviews: Review[] = [...seedReviews];
  savedProperties: Record<string, string[]> = {};
  userSettings: Record<string, UserSettings> = {};

  private idCounter = Date.now();

  generateId(prefix: string): string {
    this.idCounter++;
    return `${prefix}_${this.idCounter.toString(36)}`;
  }
}

export const store = new Store();
