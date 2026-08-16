import { submitTicketRequest } from '../services/api';
import type { Post } from '../types';

export interface CheckoutBuyer {
  name: string;
  email: string;
  quantity: number;
}

/**
 * Stripe Checkout refuses to be framed (X-Frame-Options: DENY), so an embedded
 * widget must escape its iframe. Browsers only allow a cross-origin frame to
 * navigate the top window (or open a popup) while it holds *transient* user
 * activation, which expires a few seconds after the click — and creating the
 * Stripe session is a Cloud Function round-trip that can outlive it on a cold
 * start. Reserving the tab synchronously inside the click handler, before any
 * await, is what keeps the escape reliable.
 */
export function reserveCheckoutTab(): Window | null {
  const tab = window.open('', '_blank');
  if (tab) {
    tab.document.write(
      '<!doctype html><title>Redirecting to secure checkout…</title>' +
        '<body style="margin:0;display:grid;place-items:center;height:100vh;' +
        'font:16px/1.5 system-ui,sans-serif;color:#3d3d3d;background:#faf7f2">' +
        'Redirecting to secure checkout…</body>'
    );
    tab.document.close();
  }
  return tab;
}

export interface StartCheckoutOptions {
  post: Post;
  buyer: CheckoutBuyer;
  /** Tab reserved by reserveCheckoutTab() during the click. Embedded use only. */
  reservedTab?: Window | null;
  /** True when running inside an iframe on a third-party site. */
  embedded?: boolean;
}

export type CheckoutOutcome =
  | { status: 'redirected' }
  /** Every automatic escape was blocked — render `url` as a link the buyer clicks. */
  | { status: 'manual'; url: string };

/**
 * Creates the Stripe Checkout session and sends the buyer to it.
 *
 * Throws if the session cannot be created; callers surface that as an error.
 * A 'manual' outcome is not an error — the session exists and is payable, the
 * browser just refused to navigate on our behalf.
 */
export async function startTicketCheckout({
  post,
  buyer,
  reservedTab,
  embedded = false,
}: StartCheckoutOptions): Promise<CheckoutOutcome> {
  let url: string;
  try {
    ({ url } = await submitTicketRequest({
      eventId: post.id,
      title: post.title,
      price: post.ticketPrice!,
      quantity: buyer.quantity,
      email: buyer.email,
      customerName: buyer.name,
      slug: post.slug,
    }));
  } catch (err) {
    // Don't strand the placeholder tab on a blank "Redirecting…" screen.
    reservedTab?.close();
    throw err;
  }

  if (!embedded) {
    // A caller may have reserved a tab and then not asked for embedded mode;
    // don't strand it on the placeholder while we navigate in place.
    reservedTab?.close();
    window.location.href = url;
    return { status: 'redirected' };
  }

  if (reservedTab && !reservedTab.closed) {
    reservedTab.location.href = url;
    return { status: 'redirected' };
  }

  // Popup blocked. Top-level navigation may still be permitted; it throws if
  // the embedding page sandboxes the frame or activation has already lapsed.
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return { status: 'redirected' };
    }
  } catch {
    // Fall through to the manual link.
  }

  return { status: 'manual', url };
}
