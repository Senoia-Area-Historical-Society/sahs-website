import { Timestamp, GeoPoint } from 'firebase/firestore';

export interface Post {
  id: string; 
  legacyWebflowId?: string; 
  type: 'news' | 'event';
  title: string; 
  slug: string;
  publishDate: Timestamp | null; 
  eventDate?: Timestamp | null;
  content: string; 
  excerpt: string; 
  mainImage: string; 
  galleryImages: string[]; 
  documentUrl?: string; 
  location?: string; 
  sponsorIds?: string[]; 
  
  // Ticketing fields
  ticketPrice?: number; // in cents
  capacity?: number;
  ticketsSold?: number;
  
  // System Fields
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Membership {
  id: string;
  userId: string;
  email: string;
  level: 'individual' | 'family' | 'senior' | 'patron' | 'corporate';
  status: 'active' | 'expired' | 'pending';
  expirationDate: string; // ISO Date
  quantity: number;
  autoRenew: boolean;
  stripeSubscriptionId?: string;
  
  updatedAt: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  userId?: string;
  email: string;
  quantity: number;
  totalAmount: number;
  status: 'paid' | 'cancelled';
  confirmationNumber: string;
  qrCode?: string;
  
  purchasedAt: string;
}

export interface Gallery {
  id: string;
  legacyWebflowId?: string;
  title: string; 
  slug: string;
  description: string; 
  excerpt: string; 
  coverImage: string; 
  images: string[]; 
  relatedPostIds: string[]; 
  sortOrder: number;
  
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface HistoricalPlace {
  id: string;
  legacyWebflowId?: string;
  title: string;
  slug: string;
  type: 'Home' | 'Business' | 'Place or Thing';
  description: string;
  excerpt: string;
  mainImage: string;
  galleryImages: string[];
  
  historical_address: string; 
  coordinates?: GeoPoint | null; 
  
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface OrganizationEntity {
  id: string;
  legacyWebflowId?: string;
  type: 'board_member' | 'corporate_sponsor' | 'event_sponsor';
  name: string;
  slug: string;
  
  // Fields specific to Board Members
  position?: string;
  bio?: string;
  summaryBio?: string;
  email?: string;
  phone?: string;
  headshot?: string; 
  sortPosition?: number;
  
  // Fields specific to Sponsors
  sponsorshipLevel?: string; 
  sponsorshipYear?: string;
  websiteUrl?: string;
  logoUrl?: string; 
  sponsoredEvents?: string[]; 

  // Common display fields for rendering
  image?: string;
  title?: string;
  
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Booking {
  id: string;
  date: string; // ISO Date YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  organization: string;
  contactName: string;
  email: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  purpose: string;
  paymentIntentId?: string;
  
  submittedAt: any;
}
