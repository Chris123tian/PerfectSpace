export type PropertyType = 'apartment' | 'office' | 'hostel' | 'room';
export type ListingType = 'rent' | 'sale';

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
  createdAt: string;
}

export interface PropertyFilter {
  type?: PropertyType;
  listingType?: ListingType;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  bedrooms?: number;
  searchQuery?: string;
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

export interface Review {
  id: string;
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
  avatar: string;
  phone: string;
  role: 'landlord' | 'renter';
  bio: string;
  propertiesCount: number;
  reviewsCount: number;
  rating: number;
  memberSince: string;
  verified: boolean;
}
