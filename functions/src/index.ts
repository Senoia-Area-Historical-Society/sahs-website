import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import Stripe from 'stripe';
import * as QRCode from 'qrcode';
import * as path from 'path';
import { Resend } from 'resend';
import { render } from 'react-email';
import * as React from 'react';
import { WelcomeEmail } from './emails/WelcomeEmail';
import { TicketConfirmationEmail, TicketConfirmationEmailProps } from './emails/TicketConfirmationEmail';
import { resolveEventWindow, isLongPast } from './calendarTime';
import { PUBLIC_EVENTS_CALENDAR_ID } from './calendarIds';
import { calendarFieldsChanged } from './calendarSync';
import { resolveTicketOrder, rejectionStatus } from './ticketPricing';
import { sendTicketConfirmation, formatEventWhen, resolveEventLocation } from './ticketEmail';
import {
    classifyCheckoutSession,
    parseTicketOrder,
    parseMembershipOrder,
    CheckoutKind,
    FulfillmentRejection,
} from './checkoutFulfillment';
import {
    isLifecycleEvent,
    statusForLifecycleEvent,
    buildPaymentFailureAlert,
    LifecycleEventType,
} from './subscriptionLifecycle';
import { NewsletterEmail, NewsletterEmailProps } from './emails/NewsletterEmail';

admin.initializeApp();
const db = getFirestore();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://senoiahistory.com';

const getStripe = () => {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
    return new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
    });
};

const getResend = () => new Resend(process.env.RESEND_API_KEY);

/**
 * Ceiling on how many records an auto-paged Stripe list will pull. Every membership
 * read path is bounded by this rather than by a single 100-item page, because the
 * failure mode of a bare `limit: 100` is silent: the list simply stops and the caller
 * cannot tell a complete roster from a truncated one. Set far above the ~85 live
 * subscriptions so it is a runaway backstop, not an operating limit.
 */
const MAX_STRIPE_PAGE_ITEMS = 5000;

/** Escapes a value for interpolation into a Stripe search query string. */
function escapeSearchValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Throws on a send failure rather than logging it, so `fulfillMembership` can record the
 * outcome on the membership document. Resend reports failures in the response body
 * instead of rejecting, which is how the previous version could log an error and still
 * look, to its caller, exactly like a successful send.
 */
async function sendWelcomeEmail(
    email: string,
    firstName: string,
    options: { delayedDelivery?: boolean } = {}
): Promise<'sent' | 'skipped'> {
    if (!process.env.RESEND_API_KEY) {
        // Not an error: the emulator and any local run have no Resend key, and a
        // membership must still be recorded there. Reported back as 'skipped' rather
        // than 'sent' so the membership document does not claim an email that never left.
        console.warn('RESEND_API_KEY not configured — skipping welcome email');
        return 'skipped';
    }
    const resend = getResend();
    const html = await render(
        React.createElement(WelcomeEmail, { firstName, delayedDelivery: options.delayedDelivery })
    );
    const { error } = await resend.emails.send({
        from: 'Senoia Area Historical Society <membership@updates.senoiahistory.com>',
        to: email,
        subject: 'Thank You for Your SAHS Membership',
        html,
    });
    if (error) {
        throw new Error(`Resend rejected the welcome email: ${error.message}`);
    }
    return 'sent';
}

// Configure Google Auth for Calendar API.
//
// Deliberately `require()` and not `import`: the key file is optional and is
// absent on Cloud Run, where the runtime service account supplies credentials
// instead. A static import would be hoisted and would fail the whole module at
// load time; only a runtime require can be caught like this.
let credentials: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    credentials = require(path.resolve(__dirname, '../src/service-account.json'));
} catch {
    console.warn('Google Service Account key file not found. Calendar integration will rely on environment credentials.');
}

const getCalendarAuth = () => {
    const authOptions: any = {
        scopes: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
    };
    if (credentials) {
        authOptions.credentials = credentials;
    }
    return new google.auth.GoogleAuth(authOptions);
};

// ── Helper: Generate QR code as Base64 data URI ────────────────────────────
async function generateQRCode(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: { dark: '#2c2c2c', light: '#fffdf8' },
    });
}

// ── Helper: Generate confirmation number ────────────────────────────────────
function generateConfirmationNumber(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Membership checkout is not ours to create.
//
// `createMembershipCheckoutSession` lived here and was dead code — nothing in the app
// called it. Every real membership is bought through the Stripe Pricing Table embedded in
// `src/pages/Support.tsx`, which mints its own Checkout Session in `mode: 'subscription'`.
// The removed function used `mode: 'payment'`, so anything bought through it would have
// been a one-time charge: no subscription, no auto-renewal, and invisible to
// `getMembershipByEmail` — which reads subscriptions — so the member portal would have
// told that member they were not a member. Its `priceMap` also matched none of the five
// live prices. Reviving it would duplicate what the pricing table already does better:
// Stripe-hosted, editable in the Dashboard without a deploy, and already proven.
//
// `/support-sahs/success` and `/support-sahs/cancel` intentionally remain: the pricing
// table's own confirmation page points there (and `StripeSuccess` fires the GTM
// `purchase` event), which is the only membership conversion signal there is.

// 4. Create Ticket Checkout Session
export const createTicketCheckoutSession = onRequest({ secrets: ['STRIPE_SECRET_KEY'], cors: true }, async (req, res) => {
    try {
        if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

        // `price` and `title` may still arrive from an older cached bundle. They are
        // deliberately not read: the amount comes from Firestore, never the wire.
        const { eventId, quantity, email, customerName } = req.body;

        if (!eventId || !email) {
            res.status(400).send({ error: 'Missing required fields: eventId, email' });
            return;
        }

        const snap = await db.collection('posts').doc(String(eventId)).get();
        const order = resolveTicketOrder(snap.exists ? snap.data() : undefined, quantity);
        if (!order.ok) {
            console.warn(`Rejected ticket checkout for event ${eventId}: ${order.reason}`);
            res.status(rejectionStatus(order.reason)).send({ error: order.reason });
            return;
        }

        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Tickets: ${order.title}`,
                        description: `Event tickets — Senoia Area Historical Society`
                    },
                    unit_amount: order.unitAmount,
                },
                quantity: order.quantity,
            }],
            mode: 'payment',
            // Dedicated ticket success page (not the generic membership one)
            success_url: `${FRONTEND_URL}/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/news/${order.slug}`,
            customer_email: email,
            metadata: {
                type: 'ticket',
                eventId,
                eventTitle: order.title,
                customerName: customerName || '',
                quantity: order.quantity.toString(),
            }
        });
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating ticket checkout session:', error);
        res.status(500).send({ error: "Failed to create ticket checkout session" });
    }
});

// 5. List all memberships from Stripe
export const listStripeSubscriptions = onRequest({ secrets: ['STRIPE_SECRET_KEY'], cors: true }, async (req, res) => {
    try {
        if (req.method !== 'GET' && req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
        const stripe = getStripe();
        // `active: true` is deliberately absent: 40% of the member base is still on the
        // retired Webflow products, and archiving one of those would silently rename
        // every subscription on it to 'Unknown Level' in the admin table.
        const products = await stripe.products.list({ limit: 100 }).autoPagingToArray({ limit: MAX_STRIPE_PAGE_ITEMS });
        const productNameMap: Record<string, string> = {};
        products.forEach(p => { productNameMap[p.id] = p.name; });
        // Auto-paged rather than a bare `limit: 100`. `status: 'all'` includes every
        // subscription ever created — canceled ones accumulate forever and never age
        // out — so a single page silently truncates the board's view of who is a
        // member, presenting a partial roster as if it were the whole thing.
        const subscriptions = await stripe.subscriptions
            .list({ status: 'all', expand: ['data.customer'], limit: 100 })
            .autoPagingToArray({ limit: MAX_STRIPE_PAGE_ITEMS });
        const formattedMemberships = subscriptions.map(sub => {
            const customer = sub.customer as Stripe.Customer;
            const item = sub.items.data[0];
            const plan = item.plan;
            const productId = typeof plan.product === 'string' ? plan.product : (plan.product as any).id;
            const level = productNameMap[productId] || plan.nickname || 'Unknown Level';
            return {
                id: sub.id,
                email: customer.email || 'No Email',
                customerName: customer.name || 'Unknown',
                level,
                status: sub.status,
                expirationDate: new Date(sub.current_period_end * 1000).toISOString(),
                createdAt: new Date(sub.created * 1000).toISOString(),
                stripeSubscriptionId: sub.id,
                quantity: item.quantity || 1,
            };
        });
        res.json(formattedMemberships);
    } catch (error) {
        console.error('Error listing stripe subscriptions:', error);
        res.status(500).send({ error: "Failed to list memberships" });
    }
});

// 6. Stripe Webhook Handler
//
// Two separate defects converged here, and both matter:
//
//   • No live-mode webhook endpoint was ever registered in Stripe, so this function was
//     never invoked at all — zero requests in 90 days of Cloud Run logs, `tickets` and
//     `memberships` both empty, while 27 ticket orders were paid for. That is a Stripe
//     account configuration problem, not a code one, and no change in this file fixes
//     it. Registering the endpoint is what starts delivery.
//   • Once delivery starts, the handler had to survive it. It did not: every branch was
//     wrapped in a `catch` that only logged, and the function answered
//     `res.json({ received: true })` unconditionally, so a throw on the way to the write
//     looked to Stripe like a successful delivery and was never retried.
//
// Fixing only the first would begin delivering 27 replayed events into a handler that
// silently drops whatever it fails to write. Hence the three rules below.
//
// Fulfillment is the only place a purchase becomes real. All three rules exist because
// breaking them loses a paid order:
//
//   1. Every record is keyed by the Checkout Session id, so a replay overwrites nothing
//      and double-counts nothing. Retries are only safe once this is true. Stripe
//      redelivers in two ways — automatic retries on any non-2xx, and the Dashboard's
//      manual "Resend" — and `session.id` is stable across every delivery of the same
//      event, which is what makes it the natural key. The existence check shares the
//      write's transaction because two deliveries can arrive concurrently and a plain
//      read-then-write would let both see "not found" and both insert.
//   2. A failed write answers 5xx. Stripe then retries on its own backoff for ~3 days
//      and shows the event as failing in the dashboard. The old handler answered
//      `res.json({ received: true })` unconditionally, so a throw meant Stripe recorded
//      a successful delivery and never came back.
//   3. Traffic that is not ours to fulfill answers 200. An endpoint that 5xxs on
//      unrelated events invites Stripe to disable it, which would break every future
//      purchase — a far worse outage than the one being fixed.

/** Distinguishes "a retry cannot fix this" from an ordinary transient write failure. */
class UnfulfillableSessionError extends Error {
    constructor(kind: CheckoutKind, reason: FulfillmentRejection) {
        super(`${kind} session cannot be fulfilled: ${reason}`);
        this.name = 'UnfulfillableSessionError';
    }
}

/**
 * Records a paid ticket order and its seat count in one atomic commit.
 *
 * `'duplicate'` is the retry path: the ticket doc already exists, so neither it nor
 * `ticketsSold` is touched again. Doing the increment as a second write after the ticket
 * write — as the original did — would have added a seat on every Stripe retry.
 */
async function fulfillTicket(session: Stripe.Checkout.Session): Promise<'created' | 'duplicate'> {
    const parsed = parseTicketOrder(session);
    if (!parsed.ok) throw new UnfulfillableSessionError('ticket', parsed.reason);
    const order = parsed.value;

    // Generated before the transaction: a transaction callback re-runs under contention,
    // and a fresh confirmation number per attempt would hand the buyer a code that does
    // not match the one that finally commits.
    const confirmationNumber = generateConfirmationNumber();
    const qrCode = await generateQRCode(confirmationNumber);

    const ticketRef = db.collection('tickets').doc(session.id);
    const postRef = db.collection('posts').doc(order.eventId);

    // Captured out of the transaction so the confirmation email can name the date and
    // place. Read inside it, assigned here, and used only after it commits.
    let postData: Record<string, unknown> | undefined;

    const outcome = await db.runTransaction(async (tx) => {
        // Both reads first — Firestore requires every read in a transaction to precede
        // every write. The post is read even on the duplicate path, which costs one
        // wasted lookup and keeps that ordering impossible to get wrong.
        const existing = await tx.get(ticketRef);
        const post = await tx.get(postRef);
        postData = post.exists ? post.data() : undefined;

        if (existing.exists) return 'duplicate' as const;

        tx.set(ticketRef, {
            eventId: order.eventId,
            eventTitle: order.eventTitle,
            customerName: order.customerName,
            email: order.email,
            quantity: order.quantity,
            totalAmount: order.totalAmount,
            status: 'paid',
            confirmationNumber,
            qrCode,
            // Redundant with the document id, and deliberately kept: the public success
            // page reads this collection through `allow read: if isCurator() ||
            // request.query.limit == 1`, which a query satisfies and a document `get()`
            // does not. An unauthenticated buyer can only reach their ticket by querying
            // this field, so `getTicketBySessionId` must stay a where(...).limit(1).
            stripeSessionId: session.id,
            purchasedAt: new Date().toISOString(),
        });

        if (post.exists) {
            tx.update(postRef, { ticketsSold: FieldValue.increment(order.quantity) });
        } else {
            // The ticket still commits. Losing a paid order because its event post was
            // deleted would be the same class of bug as the one this handler fixes.
            console.warn(`stripeWebhook: recorded ticket ${session.id} but event post ${order.eventId} is missing — ticketsSold not incremented`);
        }

        return 'created' as const;
    });

    // Outside the transaction, and only for a genuinely new ticket: a transaction
    // callback re-runs under contention, so an email sent inside one goes out once per
    // attempt, and a retry that finds the ticket already present must not mail again.
    //
    // Non-fatal by design. The record is what cannot be reconstructed; an email can be
    // resent from the reconciliation script. Failing the webhook here would return 500,
    // Stripe would retry, the retry would see 'duplicate' — and the buyer would still
    // have no email, at the cost of an event that looks broken in the dashboard.
    if (outcome === 'created') {
        try {
            const delivery = await sendTicketConfirmation({
                email: order.email,
                customerName: order.customerName,
                eventTitle: order.eventTitle,
                quantity: order.quantity,
                confirmationNumber,
                qrCode,
                sessionId: session.id,
                eventWhen: formatEventWhen(postData),
                eventLocation: resolveEventLocation(postData),
            }, FRONTEND_URL);
            if (delivery === 'sent') {
                await ticketRef.update({ confirmationEmailSentAt: new Date().toISOString() });
            }
            console.log(`stripeWebhook: ticket confirmation ${delivery} for ${session.id}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`stripeWebhook: ticket confirmation email FAILED for ${session.id} — the ticket is saved; resend with scripts/reconcile_ticket_orders.cjs --send-emails`, err);
            await ticketRef.update({ confirmationEmailError: message }).catch(() => undefined);
        }
    }

    return outcome;
}

/**
 * The tier name and renewal date for a subscription, or nulls if either cannot be read.
 *
 * Every failure here is swallowed on purpose. A pricing-table membership carries no
 * `metadata.level`, so this lookup is the only way to name the tier — but the name is a
 * *label*, and the money is already taken. Letting a transient Stripe error propagate
 * would throw out of `fulfillMembership`, answer Stripe 500, and have it retry a paid
 * membership forever over a display string. That is the inverse of the rule the rest of
 * this file follows: never lose a paid order to a field that is only cosmetic.
 */
async function describeSubscription(
    subscriptionId: string | null
): Promise<{ level: string | null; expirationDate: string | null }> {
    if (!subscriptionId) return { level: null, expirationDate: null };
    try {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price.product'],
        });
        const product = sub.items.data[0]?.price?.product;
        const level =
            product && typeof product !== 'string' && !('deleted' in product && product.deleted)
                ? product.name
                : null;
        return {
            level,
            expirationDate: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
        };
    } catch (err) {
        console.warn(
            `stripeWebhook: could not read subscription ${subscriptionId} for its tier name — ` +
            'recording the membership with a generic label rather than failing the order',
            err
        );
        return { level: null, expirationDate: null };
    }
}

/**
 * Records a membership, then sends the welcome email outside the transaction.
 *
 * The email is intentionally not part of the atomic unit: a transaction callback can
 * re-run, and an email sent inside one goes out once per attempt. It is also
 * non-fatal — the membership record is what the society cannot reconstruct, whereas a
 * welcome email can be resent by hand. Its outcome is written back onto the document so
 * a failure is visible to a curator rather than only in a log line.
 *
 * This replaces the tri-state ('created' | 'duplicate' | 'error') outcome added in #38,
 * which deliberately sent the email even when the write had FAILED. That was correct
 * reasoning in a handler that always answered 200: Stripe would never retry, so
 * suppressing the email on error would have left a paying member with nothing at all.
 * Returning 500 inverts it — a failed write is now retried, the record is created on a
 * later delivery, and the email goes out then. Sending on error would instead mail a
 * member whose membership does not exist, and re-mail them on every retry.
 */
async function fulfillMembership(session: Stripe.Checkout.Session): Promise<'created' | 'duplicate'> {
    const parsed = parseMembershipOrder(session);
    if (!parsed.ok) throw new UnfulfillableSessionError('membership', parsed.reason);
    const membership = parsed.value;

    const details = await describeSubscription(membership.subscriptionId);

    // Still keyed by Checkout Session id, deliberately. `stripeSubscriptionId` is written
    // as a *field* rather than promoted to the document id: two key schemes in one
    // collection is precisely the split that loses records, and the session id remains
    // stable across every Stripe redelivery. The field is what
    // `scripts/backfill_welcome_emails.cjs` queries to avoid re-mailing a member the
    // webhook already greeted.
    const ref = db.collection('memberships').doc(session.id);
    const outcome = await db.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists) return 'duplicate' as const;

        tx.set(ref, {
            email: membership.email,
            // Falls back to a generic label rather than failing: see `describeSubscription`.
            level: membership.level ?? details.level ?? 'Membership',
            quantity: membership.quantity,
            status: 'active',
            // A real subscription knows when it renews. The year-from-now guess is only
            // for a one-time join, which has no renewal date to read.
            expirationDate:
                details.expirationDate ??
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            paymentId: session.id,
            stripeSubscriptionId: membership.subscriptionId,
            userId: membership.userId,
            welcomeEmailSentAt: null,
            welcomeEmailError: null,
            updatedAt: new Date().toISOString(),
        });
        return 'created' as const;
    });

    if (outcome === 'created') {
        try {
            const delivery = await sendWelcomeEmail(membership.email, membership.firstName);
            if (delivery === 'sent') {
                await ref.update({ welcomeEmailSentAt: new Date().toISOString() });
            }
            console.log(`stripeWebhook: welcome email ${delivery} for membership ${session.id}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`stripeWebhook: welcome email FAILED for membership ${session.id} — the record is saved; resend by hand`, err);
            // Best-effort: if even this update fails the log above still stands, and
            // throwing here would fail an event whose money-critical write succeeded.
            await ref.update({ welcomeEmailError: message }).catch(() => undefined);
        }
    }

    return outcome;
}

/**
 * Records what a subscription-lifecycle event says, and shouts about a failed renewal.
 *
 * Two rules, and they differ from fulfillment's on purpose:
 *
 *   1. **A missing membership document is not an error.** These events fire for all ~85
 *      existing subscriptions, almost none of which has a record — the collection was
 *      never populated, because pricing-table sessions used to be classified
 *      `unrelated`. Treating "no record" as a failure would 500 on nearly every renewal
 *      and get the endpoint disabled.
 *   2. **A failed staff alert *does* 500.** An alert that silently fails is the exact bug
 *      being fixed here, so Stripe retries it on its own backoff and the dashboard shows
 *      the event as failing. The Firestore update is best-effort by comparison: Stripe
 *      remains the system of record for membership status, so a stale mirror row is
 *      cosmetic, whereas an unsent alert means a member lapses unnoticed.
 */
async function handleSubscriptionLifecycle(
    eventType: LifecycleEventType,
    event: Stripe.Event
): Promise<string> {
    const status = statusForLifecycleEvent(eventType);
    const object = event.data.object as Stripe.Invoice | Stripe.Subscription;

    const subscriptionId =
        object.object === 'invoice'
            ? typeof object.subscription === 'string'
                ? object.subscription
                : object.subscription?.id ?? null
            : object.id;

    // Best-effort mirror update — see rule 1. Never throws.
    if (subscriptionId) {
        try {
            const snap = await db
                .collection('memberships')
                .where('stripeSubscriptionId', '==', subscriptionId)
                .limit(1)
                .get();
            if (!snap.empty) {
                await snap.docs[0].ref.update({ status, updatedAt: new Date().toISOString() });
                console.log(`stripeWebhook: ${eventType} → memberships/${snap.docs[0].id} status=${status}`);
            } else {
                // Logged rather than ignored: this is how the mirror's coverage becomes
                // visible without querying Firestore by hand.
                console.log(`stripeWebhook: ${eventType} for ${subscriptionId} — no membership record to update`);
            }
        } catch (err) {
            console.error(`stripeWebhook: could not update membership status for ${subscriptionId}`, err);
        }
    }

    if (eventType !== 'invoice.payment_failed') return status;

    const invoice = object as Stripe.Invoice;
    const alert = buildPaymentFailureAlert({
        email: invoice.customer_email ?? null,
        customerName: invoice.customer_name ?? null,
        amountDue: invoice.amount_due ?? null,
        attemptCount: invoice.attempt_count ?? null,
        nextAttemptAt: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000).toISOString()
            : null,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
        subscriptionId,
    });

    // Throws on failure, so the caller answers 500 and Stripe retries. See rule 2.
    await sendStaffAlert(alert.subject, alert.text);
    console.warn(`stripeWebhook: renewal failure alert sent — ${alert.subject}`);
    return status;
}

/**
 * Emails the staff alert list.
 *
 * Recipients default to the two permanent admins the codebase already hardcodes (see the
 * role table in CLAUDE.md) and can be overridden with `MEMBERSHIP_ALERT_TO`, a
 * comma-separated list, without a code change.
 *
 * Throws rather than logging, for the same reason `sendWelcomeEmail` does: Resend reports
 * failures in the response body instead of rejecting, so a version that only logged would
 * look identical to a successful send.
 */
async function sendStaffAlert(subject: string, text: string): Promise<void> {
    const recipients = (process.env.MEMBERSHIP_ALERT_TO ||
        'catnolan@senoiahistory.com,jeremywarren@senoiahistory.com')
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);

    if (!process.env.RESEND_API_KEY) {
        // The emulator has no key. Loud, because in production this would mean a renewal
        // failure went unannounced — the very thing this alert exists to prevent.
        console.warn(`RESEND_API_KEY not configured — staff alert NOT sent: ${subject}`);
        return;
    }

    const { error } = await getResend().emails.send({
        from: 'SAHS Website <membership@updates.senoiahistory.com>',
        to: recipients,
        subject,
        text,
    });
    if (error) throw new Error(`Resend rejected the staff alert: ${error.message}`);
}

export const stripeWebhook = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY'] }, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
    let event: Stripe.Event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent((req as any).rawBody, sig as string, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        // 400 and no retry: an unverifiable payload will never verify on a second try.
        console.error('stripeWebhook: signature verification failed', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Subscription lifecycle: renewals succeeding, renewals failing, memberships ending.
    // Registered on the endpoint alongside `checkout.session.completed`; without these,
    // nothing in the system ever learns that a member's card stopped working.
    if (isLifecycleEvent(event.type)) {
        try {
            const status = await handleSubscriptionLifecycle(event.type, event);
            res.json({ received: true, lifecycle: event.type, status });
        } catch (err) {
            console.error(
                `stripeWebhook: FAILED to handle ${event.type} — answering 500 so Stripe retries. ` +
                'A renewal failure that is never announced is the defect this path exists to fix.',
                err
            );
            res.status(500).json({ error: 'lifecycle_failed', event: event.type });
        }
        return;
    }

    // Rule 3 — anything we are not the system of record for is acknowledged, not failed.
    if (event.type !== 'checkout.session.completed') {
        res.json({ received: true, ignored: event.type });
        return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const kind = classifyCheckoutSession(session);
    if (kind === 'unrelated') {
        console.warn(`stripeWebhook: session ${session.id} has no recognizable type — ignoring`);
        res.json({ received: true, ignored: 'unrecognized_session' });
        return;
    }

    try {
        const outcome =
            kind === 'ticket' ? await fulfillTicket(session) : await fulfillMembership(session);

        // Logged on success as well as failure, so a purchase that went missing can be
        // traced in Cloud Functions logs by session id instead of inferred from silence.
        console.log(`stripeWebhook: ${kind} ${session.id} → ${outcome}`);
        res.json({ received: true, kind, outcome });
    } catch (err) {
        const permanent = err instanceof UnfulfillableSessionError;
        console.error(
            `stripeWebhook: FAILED to fulfill ${kind} for session ${session.id} — answering 500 so Stripe retries.` +
            (permanent ? ' A retry cannot fix this; fulfil it by hand from the Stripe dashboard.' : ''),
            err
        );
        res.status(500).json({ error: 'fulfillment_failed', kind });
    }
});

// 7. Verify Ticket (at-the-door scanner)
export const verifyTicket = onRequest({ cors: true }, async (req, res) => {
    try {
        const confirmationNumber = (req.query.confirmationNumber || req.body?.confirmationNumber || '') as string;

        if (!confirmationNumber) {
            res.status(400).json({ valid: false, reason: 'missing_confirmation_number' });
            return;
        }

        const snap = await db.collection('tickets')
            .where('confirmationNumber', '==', confirmationNumber.toUpperCase().trim())
            .limit(1)
            .get();

        if (snap.empty) {
            res.json({ valid: false, reason: 'not_found' });
            return;
        }

        const ticket = snap.docs[0].data();

        if (ticket.status === 'cancelled') {
            res.json({ valid: false, reason: 'cancelled' });
            return;
        }

        res.json({
            valid: true,
            ticket: {
                confirmationNumber: ticket.confirmationNumber,
                eventTitle: ticket.eventTitle,
                customerName: ticket.customerName,
                email: ticket.email,
                quantity: ticket.quantity,
                purchasedAt: ticket.purchasedAt,
            }
        });
    } catch (error) {
        console.error('Error verifying ticket:', error);
        res.status(500).json({ valid: false, reason: 'server_error' });
    }
});

// 7b. Public ticket lookup for the post-checkout confirmation page.
//
// This exists so `firestore.rules` does not have to expose `tickets` publicly.
// The rule it replaces was `allow read: if isCurator() || request.query.limit == 1`,
// which let *any* unauthenticated caller page through the entire collection with
// limit-1 cursors, reading names, emails and confirmation numbers — and
// `verifyTicket` validates at the door on confirmation number alone.
//
// What makes this endpoint safe without auth is the Checkout Session id: it is
// high-entropy and Stripe only ever hands it to the buyer, in the redirect URL.
// You cannot enumerate tickets with it, which is exactly the property the old
// rule lacked. Do not add a lookup by email, name or confirmation number here —
// those are all guessable and would reintroduce the hole this closes.
//
// The response is an explicit field whitelist rather than the raw document, so a
// field added to a ticket later (Stripe metadata, internal notes) is not exposed
// by default. It carries only what /tickets/success renders.
export const getTicketBySession = onRequest({ cors: true }, async (req, res) => {
    try {
        const sessionId = ((req.query.session_id || req.query.sessionId ||
            req.body?.session_id || req.body?.sessionId || '') as string).trim();

        if (!sessionId) {
            res.status(400).json({ found: false, reason: 'missing_session_id' });
            return;
        }

        // Tickets are keyed by Checkout Session id (`tickets/{session.id}`), so the
        // direct get is the normal path. The query is a fallback for any document
        // written before that convention, which carries the id only as a field.
        let snap = await db.collection('tickets').doc(sessionId).get();

        if (!snap.exists) {
            const legacy = await db.collection('tickets')
                .where('stripeSessionId', '==', sessionId)
                .limit(1)
                .get();
            if (legacy.empty) {
                // Not an error: the confirmation page polls this while the webhook
                // is still in flight, and treats a miss as 'pending'.
                res.json({ found: false, reason: 'not_found' });
                return;
            }
            snap = legacy.docs[0];
        }

        const t = snap.data() as Record<string, unknown>;

        res.json({
            found: true,
            ticket: {
                id: snap.id,
                eventId: t.eventId ?? null,
                eventTitle: t.eventTitle ?? null,
                customerName: t.customerName ?? null,
                email: t.email ?? null,
                quantity: t.quantity ?? 0,
                totalAmount: t.totalAmount ?? 0,
                status: t.status ?? null,
                confirmationNumber: t.confirmationNumber ?? null,
                purchasedAt: t.purchasedAt ?? null,
                qrCode: t.qrCode ?? null,
            },
        });
    } catch (error) {
        console.error('Error looking up ticket by session:', error);
        res.status(500).json({ found: false, reason: 'server_error' });
    }
});

// 8b. Sync Published Event Posts to Google Calendar
export const onPostWritten = onDocumentWritten('posts/{postId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    
    // 1. Handle deletion
    if (beforeData && !afterData) {
        if (beforeData.googleCalendarEventId) {
            const auth = getCalendarAuth();
            try {
                const calendar = google.calendar({ version: 'v3', auth });
                await calendar.events.delete({
                    calendarId: PUBLIC_EVENTS_CALENDAR_ID,
                    eventId: beforeData.googleCalendarEventId
                });
            } catch (err) {
                console.error('Failed to delete calendar event for deleted post:', err);
            }
        }
        return;
    }
    
    // 2. Handle creation / updates
    if (afterData) {
        const isEvent = afterData.type === 'event';
        const isPublished = afterData.status === 'published';
        const wasPublished = beforeData ? beforeData.status === 'published' : false;
        
        // We only care about published Events
        if (!isEvent) return;
        
        const auth = getCalendarAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Case A: Published event with no calendar entry yet. Gated on the missing
        // googleCalendarEventId rather than on `!wasPublished` so that an event whose
        // earlier sync was skipped — published before its date was filled in — still
        // gets onto the calendar once the date arrives. (A published event that never
        // gets a date re-enters here on every write and simply warns.)
        if (isPublished && !afterData.googleCalendarEventId) {
            try {
                const window = resolveEventWindow(afterData);
                if (!window) {
                    console.warn(`Skipping calendar insert for post ${event.params.postId}: no usable event date`);
                    return;
                }
                const { startDateTime, endDateTime } = window;

                // Never create an entry for an event that is already over. This path
                // is gated only on the post lacking a googleCalendarEventId, so
                // re-saving an old write-up — or a migration touching one — is
                // indistinguishable from publishing a new event. Patching an entry
                // that already exists (Case B) stays allowed: keeping a real entry
                // accurate is right whatever its date.
                if (isLongPast(startDateTime)) {
                    console.log(`Skipping calendar insert for post ${event.params.postId}: event already past (${startDateTime})`);
                    return;
                }

                const calendarEvent = {
                    summary: `SAHS Event: ${afterData.title}`,
                    description: afterData.excerpt || afterData.content?.replace(/<[^>]*>/g, '').substring(0, 300) || '',
                    location: afterData.location || afterData.eventLocation || '',
                    start: { dateTime: startDateTime, timeZone: 'America/New_York' },
                    end: { dateTime: endDateTime, timeZone: 'America/New_York' },
                };
                
                const response = await calendar.events.insert({
                    calendarId: PUBLIC_EVENTS_CALENDAR_ID,
                    requestBody: calendarEvent
                });
                
                await event.data?.after.ref.update({
                    googleCalendarEventId: response.data.id
                });
            } catch (err) {
                console.error('Error creating Google Calendar event:', err);
            }
        }
        // Case B: Edited details of a published event that already has a calendar entry
        else if (isPublished && afterData.googleCalendarEventId) {
            // Only patch when something the entry is actually built from moved. This
            // trigger fires on every write, and every ticket sale increments
            // `ticketsSold` on the post — without this, each sale spent a Calendar
            // write re-sending identical data.
            if (!calendarFieldsChanged(beforeData, afterData)) return;
            try {
                const window = resolveEventWindow(afterData);
                if (!window) {
                    console.warn(`Skipping calendar patch for post ${event.params.postId}: no usable event date`);
                    return;
                }
                const { startDateTime, endDateTime } = window;

                await calendar.events.patch({
                    calendarId: PUBLIC_EVENTS_CALENDAR_ID,
                    eventId: afterData.googleCalendarEventId,
                    requestBody: {
                        summary: `SAHS Event: ${afterData.title}`,
                        description: afterData.excerpt || afterData.content?.replace(/<[^>]*>/g, '').substring(0, 300) || '',
                        location: afterData.location || afterData.eventLocation || '',
                        start: { dateTime: startDateTime, timeZone: 'America/New_York' },
                        end: { dateTime: endDateTime, timeZone: 'America/New_York' },
                    }
                });
            } catch (err) {
                console.error('Error updating Google Calendar event:', err);
            }
        }
        // Case C: Unpublished/Archived event (was published, now is draft/archived)
        else if (!isPublished && wasPublished && afterData.googleCalendarEventId) {
            try {
                await calendar.events.delete({
                    calendarId: PUBLIC_EVENTS_CALENDAR_ID,
                    eventId: afterData.googleCalendarEventId
                });
                await event.data?.after.ref.update({
                    googleCalendarEventId: FieldValue.delete()
                });
            } catch (err) {
                console.error('Error deleting Google Calendar event for unpublished post:', err);
            }
        }
    }
});

// 9. Member self-service lookup (public, returns only the queried email's data)
export const getMembershipByEmail = onRequest({ secrets: ['STRIPE_SECRET_KEY'], cors: true }, async (req, res) => {
    try {
        const email = ((req.query.email as string) || (req.body?.email as string) || '').toLowerCase().trim();
        if (!email || !email.includes('@')) {
            res.status(400).json({ error: 'Valid email required' });
            return;
        }

        const stripe = getStripe();

        // Find all Stripe customers with this email. The address is escaped rather than
        // interpolated raw: this endpoint is public, `email` is only checked for an '@',
        // and an unescaped quote produces a malformed search query — a 500 that the
        // member portal renders as "Could not reach the membership server".
        const customers = await stripe.customers
            .search({ query: `email:"${escapeSearchValue(email)}"` })
            .autoPagingToArray({ limit: MAX_STRIPE_PAGE_ITEMS });
        if (customers.length === 0) {
            res.json({ found: false, memberships: [] });
            return;
        }

        // Fetch product names once. See listStripeSubscriptions for why archived
        // products are included.
        const products = await stripe.products.list({ limit: 100 }).autoPagingToArray({ limit: MAX_STRIPE_PAGE_ITEMS });
        const productMap = new Map(products.map(p => [p.id, p.name]));

        const memberships: object[] = [];
        for (const customer of customers) {
            const subs = await stripe.subscriptions
                .list({ customer: customer.id, status: 'all', limit: 100 })
                .autoPagingToArray({ limit: MAX_STRIPE_PAGE_ITEMS });
            for (const sub of subs) {
                const productId = sub.items.data[0]?.price?.product as string;
                memberships.push({
                    level: productMap.get(productId) || 'Membership',
                    status: sub.status,
                    expirationDate: new Date(sub.current_period_end * 1000).toISOString(),
                    cancelAtPeriodEnd: sub.cancel_at_period_end,
                });
            }
        }

        res.json({ found: memberships.length > 0, memberships });
    } catch (err: any) {
        console.error('getMembershipByEmail error:', err);
        res.status(500).json({ error: 'Failed to look up membership' });
    }
});

// 10. Render email preview (admin use — returns HTML for iframe display)
export const renderEmailPreview = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
    try {
        const { template, props } = req.body as { template: string; props: Record<string, unknown> };
        let html = '';
        if (template === 'welcome') {
            html = await render(
                React.createElement(WelcomeEmail, props as { firstName?: string; delayedDelivery?: boolean })
            );
        } else if (template === 'newsletter') {
            html = await render(React.createElement(NewsletterEmail, props as unknown as NewsletterEmailProps));
        } else if (template === 'ticket') {
            // Sample values so the preview is legible with an empty props object — this
            // template is normally populated from a real purchase, not typed by an admin.
            html = await render(React.createElement(TicketConfirmationEmail, {
                customerName: 'Cat Nolan',
                eventTitle: 'Yacht Rock Party',
                eventWhen: 'Saturday, August 29, 2026 at 7:00 PM',
                eventLocation: 'Freeman Sasser Building, Senoia, GA',
                quantity: 2,
                confirmationNumber: 'SAMPLE01',
                ticketUrl: `${FRONTEND_URL}/tickets/success?session_id=cs_example`,
                ...(props as Partial<TicketConfirmationEmailProps>),
            }));
        } else {
            res.status(400).json({ error: 'Unknown template' });
            return;
        }
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        console.error('renderEmailPreview error:', err);
        res.status(500).json({ error: 'Render failed' });
    }
});

// 11. Send newsletter to all members via Resend
export const sendNewsletter = onRequest({ secrets: ['RESEND_API_KEY', 'RESEND_AUDIENCE_ID'], cors: true, invoker: 'public' }, async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) { res.status(500).json({ error: 'RESEND_API_KEY not configured' }); return; }

    try {
        const { newsletterProps, testEmail } = req.body as {
            newsletterProps: NewsletterEmailProps;
            testEmail?: string;
        };
        const resend = getResend();
        const html = await render(React.createElement(NewsletterEmail, newsletterProps));

        if (testEmail) {
            // Test send to a single address
            const { error } = await resend.emails.send({
                from: 'Senoia Area Historical Society <membership@updates.senoiahistory.com>',
                to: testEmail,
                subject: `[TEST] ${newsletterProps.subject}`,
                html,
            });
            if (error) { res.status(500).json({ error }); return; }
            res.json({ sent: 1, mode: 'test' });
        } else {
            // Create a Resend broadcast (sends to all contacts in the audience)
            const audienceId = process.env.RESEND_AUDIENCE_ID;
            if (!audienceId) { res.status(500).json({ error: 'RESEND_AUDIENCE_ID not configured' }); return; }
            const broadcastRes = await fetch('https://api.resend.com/broadcasts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audience_id: audienceId,
                    from: 'Senoia Area Historical Society <membership@updates.senoiahistory.com>',
                    subject: newsletterProps.subject,
                    html,
                    name: `Newsletter — ${newsletterProps.issueLabel || 'Draft'}`,
                }),
            });
            const broadcastData = await broadcastRes.json() as { id?: string; name?: string };
            res.json({ broadcast: broadcastData, mode: 'broadcast' });
        }
    } catch (err) {
        console.error('sendNewsletter error:', err);
        res.status(500).json({ error: 'Failed to send newsletter' });
    }
});

// 12. Shortlink Redirect
export const shortlinkRedirect = onRequest({ cors: true }, async (req, res): Promise<void> => {
    try {
        const slug = req.path.substring(1); // removes the leading slash
        
        if (!slug) {
            res.redirect(301, FRONTEND_URL);
            return;
        }

        // 1. Check custom shortlinks collection
        const shortlinkSnap = await db.collection('shortlinks').where('slug', '==', slug).limit(1).get();
        if (!shortlinkSnap.empty) {
            const data = shortlinkSnap.docs[0].data();
            if (data && data.targetUrl) {
                res.redirect(301, data.targetUrl);
                return;
            }
        }

        // 2. Fallback to posts collection
        const postsSnap = await db.collection('posts').where('slug', '==', slug).limit(1).get();
        if (!postsSnap.empty) {
            res.redirect(301, `${FRONTEND_URL}/news/${slug}`);
            return;
        }

        // 3. If neither found, redirect to homepage
        res.redirect(301, FRONTEND_URL);
    } catch (error) {
        console.error('Error redirecting shortlink:', error);
        res.redirect(301, FRONTEND_URL);
    }
});
