import { Timestamp, GeoPoint } from 'firebase/firestore';

export interface Post {
  id: string; 
  legacyWebflowId?: string; 
  /**
   * Always `'event'` on anything saved since the news/event split was removed.
   * `'news'` survives on legacy documents only — no read path branches on this
   * field; `getEventsSplit` partitions by date instead.
   */
  type: 'event' | 'news';
  title: string; 
  slug: string;
  status: 'draft' | 'published' | 'archived';
  publishDate: Timestamp | null; 
  eventDate?: Timestamp | null;
  content: string; 
  excerpt: string; 
  mainImage: string; 
  bannerImage?: string;
  squareImage?: string;
  galleryImages: string[]; 
  documentUrl?: string; 
  location?: string; 
  sponsorIds?: string[]; 
  
  // Ticketing fields
  ticketPrice?: number; // in cents
  capacity?: number;
  ticketsSold?: number;

  // Volunteer signup fields
  volunteerSheetId?: string | null;

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

  /**
   * Welcome-email outcome, written by `stripeWebhook` after the membership record
   * commits. The email is sent outside the fulfillment transaction and is deliberately
   * non-fatal — the record is what cannot be reconstructed — so these two fields are
   * where a silent send failure becomes visible. Exactly one is ever set: an ISO
   * timestamp on success, a Resend error message on failure. Both stay `null` when the
   * send was skipped for want of a configured API key.
   */
  welcomeEmailSentAt?: string | null;
  welcomeEmailError?: string | null;

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

// ── Volunteer Management ──────────────────────────────────────────────────────

export interface VolunteerSheet {
  id: string;
  title: string;                    // e.g., "Fall Festival 2025 Volunteers"
  description?: string | null;      // Plain-text intro shown on public page
  eventPostId?: string | null;      // Optional ref to a posts/{id} Event doc
  eventDate?: Timestamp | null;     // Denormalized from linked event
  eventLocation?: string | null;    // Denormalized from linked event
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
  timeNote?: string | null;         // e.g., "8:00 AM – 10:00 AM"
  shiftDuration?: string | null;    // e.g., "2 hours", "30 min"
  capacity: number;                 // Max volunteers for this slot
  filledCount: number;              // Maintained via Firestore transaction on signup
  sortOrder: number;
}

export interface VolunteerRegistration {
  id: string;
  slotId: string;                   // Which slot they signed up for
  slotLabel: string;                // Denormalized for display
  slotTimeNote?: string | null;     // Denormalized for confirmation email
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  notes?: string | null;            // Optional message from volunteer
  status: 'confirmed' | 'cancelled';
  signedUpAt: Timestamp | null;
}

export interface ShortLink {
  id: string;
  slug: string;
  targetUrl: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/**
 * A public form submission — a contact message, or a vendor/sponsor application.
 *
 * The fields vary by `type`, which is why most are optional: the contact form sends
 * `name`/`message`, the vendor form sends `businessName`/`productDescription`, and
 * `firestore.rules` allows the union while rejecting anything outside it.
 */
export interface Submission {
  id: string;
  type: 'contact' | 'vendor' | 'sponsor';
  status: 'pending';
  submittedAt: string;
  email: string;
  name?: string;
  message?: string;
  businessName?: string;
  contactName?: string;
  phone?: string;
  website?: string;
  productDescription?: string;
}
