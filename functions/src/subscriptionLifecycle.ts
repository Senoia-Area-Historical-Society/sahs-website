/**
 * What a Stripe subscription-lifecycle event means, decided without touching Firestore,
 * Resend, or the Stripe SDK.
 *
 * Import-free on purpose. `src/test/*` imports this module, and the site's `tsc -b`
 * follows those imports — it has no `node` types and none of the functions
 * dependencies, so a single `import Stripe from 'stripe'` here would fail the ROOT
 * build and ship as a failed deploy on main. See the CLAUDE.md note on that trap; the
 * Resend half lives in `index.ts`.
 *
 * Why these three events exist at all: the live webhook endpoint subscribed only to
 * `checkout.session.completed`, so nothing in the system ever learned that a renewal had
 * failed. One member's card failed on 2026-08-02, Stripe made a single attempt and gave
 * up, and the lapse was discovered three weeks later only by reading invoices by hand.
 * For an organisation whose entire membership model is annual auto-renewal, that is the
 * event that matters most.
 */

/**
 * The lifecycle events the webhook endpoint is registered for, beyond
 * `checkout.session.completed`.
 *
 * Keep this in sync with the endpoint's `enabled_events` in the Stripe Dashboard. A type
 * present here but not registered there is simply never delivered — the code is correct
 * and does nothing, which is the failure mode this whole change exists to remove.
 */
export const LIFECYCLE_EVENT_TYPES = [
    'invoice.payment_failed',
    'invoice.paid',
    'customer.subscription.deleted',
] as const;

export type LifecycleEventType = (typeof LIFECYCLE_EVENT_TYPES)[number];

export function isLifecycleEvent(eventType: string): eventType is LifecycleEventType {
    return (LIFECYCLE_EVENT_TYPES as readonly string[]).includes(eventType);
}

/**
 * The membership status a lifecycle event implies.
 *
 * `'past_due'` rather than `'canceled'` for a failed payment: Stripe keeps the
 * subscription alive through its retry window, and writing it off on the first failure
 * would drop a member who is one card update away from being current.
 */
export function statusForLifecycleEvent(eventType: LifecycleEventType): string {
    switch (eventType) {
        case 'invoice.payment_failed':
            return 'past_due';
        case 'invoice.paid':
            return 'active';
        case 'customer.subscription.deleted':
            return 'canceled';
    }
}

export interface PaymentFailureFacts {
    email: string | null;
    customerName: string | null;
    amountDue: number | null;
    attemptCount: number | null;
    /** Stripe's next scheduled retry, or null when it has stopped trying. */
    nextAttemptAt: string | null;
    hostedInvoiceUrl: string | null;
    subscriptionId: string | null;
}

export interface StaffAlert {
    subject: string;
    /** Plain text: this is an internal ops alert, not a member-facing letter. */
    text: string;
}

/** Cents to a display string. `null` becomes "unknown" rather than "$0.00". */
function formatAmount(cents: number | null): string {
    if (cents === null || !Number.isFinite(cents)) return 'an unknown amount';
    return `$${(cents / 100).toFixed(2)}`;
}

/**
 * The staff alert for a failed renewal.
 *
 * Deliberately leads with whether Stripe will try again. `nextAttemptAt === null` is the
 * urgent case — it means the retry schedule is exhausted and nothing further will happen
 * automatically, so the member lapses unless a person acts. That is precisely what went
 * unnoticed for three weeks.
 */
export function buildPaymentFailureAlert(facts: PaymentFailureFacts): StaffAlert {
    const who = facts.customerName?.trim() || facts.email || 'An unidentified member';
    const stopped = facts.nextAttemptAt === null;

    const subject = stopped
        ? `SAHS membership renewal FAILED — no further retries — ${facts.email ?? 'unknown email'}`
        : `SAHS membership renewal failed (Stripe will retry) — ${facts.email ?? 'unknown email'}`;

    const lines = [
        `${who} had a membership renewal payment fail.`,
        '',
        `Member:        ${facts.email ?? 'unknown'}`,
        `Amount due:    ${formatAmount(facts.amountDue)}`,
        `Attempt count: ${facts.attemptCount ?? 'unknown'}`,
        `Subscription:  ${facts.subscriptionId ?? 'unknown'}`,
        '',
        stopped
            ? 'Stripe has STOPPED retrying this invoice. The membership will lapse unless ' +
              'someone contacts the member. This needs a person.'
            : `Stripe will retry automatically on ${facts.nextAttemptAt}. No action needed yet.`,
    ];

    if (facts.hostedInvoiceUrl) {
        lines.push('', `The member can pay it directly here:`, facts.hostedInvoiceUrl);
    }

    return { subject, text: lines.join('\n') };
}
