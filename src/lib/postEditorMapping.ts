/**
 * Pure field-mapping for the ContentAdmin post editor.
 *
 * The editor keeps a few *display-only* fields on `editingPost` that do not match
 * the names of their stored Firestore counterparts:
 *
 *   display field         stored field
 *   --------------------  ------------
 *   eventStartDate    ->  eventDate      (datetime-local string -> Date)
 *   eventLocation     ->  location       (string -> string)
 *   publishDateDisplay -> publishDate    (datetime-local string -> Date)
 *   _ticketPriceDisplay-> ticketPrice    (dollars string -> integer cents)
 *
 * Every one of these renames is a chance to destroy data: `buildPostData` writes the
 * stored field *from* the display field, so if `buildEditorState` fails to seed the
 * display field from the stored one, the save silently blanks it. Same-named fields
 * are safe because `buildPostData` spreads `...editingPost` wholesale.
 *
 * These two functions are the round-trip. Keep them pure so
 * `src/test/postEditorMapping.test.ts` can assert the invariant directly.
 */

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocation?: string;
  publishDate?: any;
  createdAt: any;
  updatedAt: any;
  excerpt?: string;
  // Ticketing fields (stored in Firestore)
  ticketPrice?: number | null;
  capacity?: number | null;
  ticketsSold?: number;
  galleryImages?: string[];
  // Volunteer signup fields (stored in Firestore)
  volunteerSheetId?: string | null;
  // Editor-only ephemeral fields — `buildPostData` strips these before every save.
  _enableTicketing?: boolean;
  _ticketPriceDisplay?: string;
  _enableVolunteer?: boolean;
  [key: string]: any;
}

/** Firestore Timestamp (or anything Date-like) -> `datetime-local` input value. */
export const timestampToLocalISO = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

/**
 * Seed the editor form state from a stored post.
 *
 * Every display-only field must be initialized from its stored counterpart here —
 * see the rename table above.
 */
export function buildEditorState(post: Post): Post {
  return {
    ...post,
    eventStartDate: post.eventDate ? timestampToLocalISO(post.eventDate) : post.eventStartDate || '',
    eventEndDate: post.eventEndDate || '',
    // Fall back to the canonical `location`: posts created outside this editor
    // (migration/seed scripts, older code) store `location` with no `eventLocation`.
    eventLocation: post.eventLocation ?? post.location ?? '',
    publishDateDisplay: post.publishDate ? timestampToLocalISO(post.publishDate) : '',
    _ticketPriceDisplay: post.ticketPrice ? (post.ticketPrice / 100).toFixed(2) : '',
    _enableTicketing: !!post.ticketPrice,
    _enableVolunteer: !!post.volunteerSheetId,
  };
}

export interface BuildPostDataOptions {
  /** Slug already validated for uniqueness by the caller. */
  slug: string;
  /** Used when the post carries no author of its own. */
  fallbackAuthor: string;
  /** `serverTimestamp()` sentinel — injected so this stays pure and testable. */
  now: unknown;
  /** True when creating rather than updating. */
  isNew: boolean;
}

/** Map editor form state back to the Firestore document payload. */
export function buildPostData(
  editingPost: Partial<Post>,
  { slug, fallbackAuthor, now, isNew }: BuildPostDataOptions
) {
  const postData: Record<string, any> = {
    ...editingPost,
    // Every post is an event. The news/event split is gone: `getEventsSplit`
    // partitions by date alone, so a post with no `eventDate` is simply one
    // that already happened. Legacy documents still carry `type: 'news'`;
    // nothing reads it, and re-saving one normalizes it here.
    type: 'event',
    slug,
    author: editingPost.author || fallbackAuthor,
    status: editingPost.status || 'draft',
    updatedAt: now,
  };

  if (isNew) {
    postData.createdAt = now;
    postData.publishDate = editingPost.publishDateDisplay
      ? new Date(editingPost.publishDateDisplay)
      : now;
  } else if (editingPost.publishDateDisplay) {
    postData.publishDate = new Date(editingPost.publishDateDisplay);
  } else if (editingPost.status === 'published' && !editingPost.publishDate) {
    postData.publishDate = now;
  }

  // Both writes are unconditional. Gating them on `eventStartDate` used to mean an
  // event with no start date never got its typed venue promoted to `location` (the
  // field every public page reads), and that blanking an existing start date left a
  // stale `eventDate` behind.
  postData.eventDate = editingPost.eventStartDate ? new Date(editingPost.eventStartDate) : null;
  postData.location = editingPost.eventLocation || '';

  delete postData.publishDateDisplay;

  // Ticketing config — convert display price ($) to cents for Stripe
  const enableTicketing = editingPost._enableTicketing;
  if (enableTicketing && editingPost._ticketPriceDisplay) {
    postData.ticketPrice = Math.round(parseFloat(editingPost._ticketPriceDisplay) * 100);
    postData.capacity = parseInt(String(editingPost.capacity)) || null;
  } else if (!enableTicketing) {
    postData.ticketPrice = null;
    postData.capacity = null;
  }
  // Never overwrite ticketsSold from the editor
  delete postData.ticketsSold;

  // Volunteer signup link
  postData.volunteerSheetId = editingPost._enableVolunteer && editingPost.volunteerSheetId
    ? editingPost.volunteerSheetId
    : null;

  // Editor-only fields never belong in Firestore.
  delete postData._enableTicketing;
  delete postData._ticketPriceDisplay;
  delete postData._enableVolunteer;

  // Firestore rejects `undefined` outright ("Unsupported field value: undefined") unless
  // `ignoreUndefinedProperties` is set, which src/lib/firebase.ts does not set — so a
  // single cleared field would throw and take the whole save with it. Normalize to null,
  // which every consumer already treats as "absent".
  for (const key of Object.keys(postData)) {
    if (postData[key] === undefined) postData[key] = null;
  }

  return postData;
}
