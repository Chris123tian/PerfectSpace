import {
  Property,
  User,
  Conversation,
  ChatMessage,
  Booking,
  AppNotification,
  Review,
} from "@/types/property";

const seedUsers: User[] = [
  {
    id: "admin1",
    name: "Admin Panel",
    email: "admin@perfectspace.com",
    password: "admin123",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
    phone: "+1 (555) 000-0000",
    role: "admin",
    bio: "Platform administrator managing Perfect Space.",
    propertiesCount: 0,
    reviewsCount: 0,
    rating: 5,
    memberSince: "Jan 2024",
    verified: true,
    isActive: true,
  },
];

const seedProperties: Property[] = [];
const seedConversations: Conversation[] = [];
const seedChatMessages: ChatMessage[] = [];
const seedReviews: Review[] = [];
const seedBookings: Booking[] = [];
const seedNotifications: AppNotification[] = [];

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
