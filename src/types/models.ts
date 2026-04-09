import { HalachicProfile } from './halachic';

export interface User {
  id: string;
  email: string;
  displayName: string;
  halachicProfile: HalachicProfile;
  locationEnabled: boolean;
  biometricEnabled: boolean;
  createdAt: string;
}

export interface Rabbi {
  id: string;
  name: string;
  specialty: HalachicProfile;
  isAvailable: boolean;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  isEncrypted: boolean;
  createdAt: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  category: 'nail' | 'gel' | 'beauty';
  latitude: number;
  longitude: number;
  distanceKm?: number;
  rating: number;
  portfolioImages: string[];
  phone: string;
}

export interface ForumPost {
  id: string;
  anonymousHandle: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  replyCount: number;
}
