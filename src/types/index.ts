import { Timestamp, GeoPoint } from 'firebase/firestore';

export interface Post {
  id: string; 
  legacyWebflowId?: string; 
  type: 'news' | 'event';
  title: string; 
  slug: string;
  status: 'draft' | 'published' | 'archived';
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
  userId?: string;
  email: string;
  customerName?: string;
  level: string;
  status: string;
  expirationDate: string; // ISO Date
  createdAt?: string; // ISO Date
  quantity: number;
  autoRenew?: boolean;
  stripeSubscriptionId?: string;
  
  updatedAt?: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;       // Denormalized event name stored at purchase time
  customerName?: string;    // Buyer's full name
  userId?: string;
  email: string;
  quantity: number;
  totalAmount: number;      // In cents, from session.amount_total
  status: 'paid' | 'cancelled';
  confirmationNumber: string;
  qrCode?: string;          // Base64 data URI PNG of QR code
  stripeSessionId?: string; // For TicketSuccess page lookup
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

// ── Volunteer Management ──────────────────────────────────────────────────────

export interface VolunteerSheet {
  id: string;
  title: string;                    // e.g., "Fall Festival 2025 Volunteers"
  description?: string;             // Plain-text intro shown on public page
  eventPostId?: string;             // Optional ref to a posts/{id} Event doc
  eventDate?: Timestamp | null;     // Denormalized from linked event
  eventLocation?: string;           // Denormalized from linked event
  status: 'draft' | 'active' | 'closed';
  shareToken: string;               // Random URL-safe token for public link
  createdBy: string;                // Admin email
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface VolunteerSlot {
  id: string;
  sheetId: string;                  // Parent sheet ID (denormalized for convenience)
  label: string;                    // e.g., "Set up tables", "Greet guests"
  timeNote?: string;                // e.g., "8:00 AM – 10:00 AM"
  shiftDuration?: string;           // e.g., "2 hours", "30 min"
  capacity: number;                 // Max volunteers for this slot
  filledCount: number;              // Maintained via Firestore transaction on signup
  sortOrder: number;
}

export interface VolunteerRegistration {
  id: string;
  slotId: string;                   // Which slot they signed up for
  slotLabel: string;                // Denormalized for display
  slotTimeNote?: string;            // Denormalized for confirmation email
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  notes?: string;                   // Optional message from volunteer
  status: 'confirmed' | 'cancelled';
  signedUpAt: Timestamp | null;
}
