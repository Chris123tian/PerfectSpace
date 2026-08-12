export type PropertyType = 'apartment' | 'office' | 'hostel' | 'room' | 'hotel';
export type ListingType = 'rent' | 'sale';
export type UserRole = 'renter' | 'landlord' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PropertyStatus = 'active' | 'pending' | 'rejected' | 'archived';

export interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  listingType: ListingType;
  price: number;
  currency: string;
  period?: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  images: string[];
  amenities: string[];
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  status: PropertyStatus;
  createdAt: string;
  country?: string;
  whatsappPhone?: string;
}

export interface PropertyFilter {
  type?: PropertyType;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  bedrooms?: number;
  searchQuery?: string;
  country?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  propertyId: string;
  propertyTitle: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  participantAvatars: string[];
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: Record<string, number>;
}

export interface Review {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  phone: string;
  role: UserRole;
  bio: string;
  propertiesCount: number;
  reviewsCount: number;
  rating: number;
  memberSince: string;
  verified: boolean;
  isActive: boolean;
  country?: string;
  idDocumentUri?: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  renterId: string;
  renterName: string;
  renterAvatar: string;
  ownerId: string;
  ownerName: string;
  date: string;
  time: string;
  status: BookingStatus;
  notes: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'message' | 'review' | 'system' | 'property';
  read: boolean;
  createdAt: string;
  data?: Record<string, string>;
}
