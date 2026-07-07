import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import Stripe from 'stripe';
import * as QRCode from 'qrcode';
import * as path from 'path';
import { Resend } from 'resend';
import { render } from 'react-email';
import * as React from 'react';
import { WelcomeEmail } from './emails/WelcomeEmail';
import { NewsletterEmail, NewsletterEmailProps } from './emails/NewsletterEmail';

admin.initializeApp();
const db = admin.firestore();

const CALENDAR_ID = 'c_188962a8uva3ijbpl6cdtc9621g6m@resource.calendar.google.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://senoiahistory.com';

const getStripe = () => {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
    return new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
    });
};

const getResend = () => new Resend(process.env.RESEND_API_KEY);

async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured — skipping welcome email');
        return;
    }
    const resend = getResend();
    const html = await render(React.createElement(WelcomeEmail, { firstName }));
    const { error } = await resend.emails.send({
        from: 'Senoia Area Historical Society <membership@updates.senoiahistory.com>',
        to: email,
        subject: 'Thank You for Your SAHS Membership',
        html,
    });
    if (error) {
        console.error('Resend welcome email failed:', error);
    }
}

// Configure Google Auth for Calendar API
let credentials: any = null;
try {
    credentials = require(path.resolve(__dirname, '../src/service-account.json'));
} catch (error) {
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

// 1. Check Calendar Availability
export const checkCalendarAvailability = onRequest({ cors: true }, async (req, res) => {
    try {
        const { timeMin, timeMax } = req.body;
        if (!timeMin || !timeMax) {
            res.status(400).send({ error: "Missing timeMin or timeMax" });
            return;
        }
        const auth = getCalendarAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        const response = await calendar.freebusy.query({
            requestBody: { timeMin, timeMax, items: [{ id: CALENDAR_ID }] }
        });
        const busy = response.data.calendars?.[CALENDAR_ID]?.busy || [];
        res.json({ busy });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).send({ error: "Failed to check availability" });
    }
});

// 2. Create Stripe Checkout Session for Room Booking
export const createBookingCheckoutSession = onRequest({ secrets: ['STRIPE_SECRET_KEY'], cors: true }, async (req, res) => {
    try {
        if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
        const { organization, contactName, email, date, startTime, endTime, purpose } = req.body;
        const bookingRef = await db.collection('bookings').add({
            organization, contactName, email, date, startTime, endTime, purpose,
            status: 'pending',
            submittedAt: FieldValue.serverTimestamp()
        });
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Meeting Room Booking',
                        description: `Booking for ${organization} on ${date} from ${startTime} to ${endTime}`,
                    },
                    unit_amount: 5000,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${FRONTEND_URL}/meeting-room/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/meeting-room/cancel`,
            client_reference_id: bookingRef.id,
            customer_email: email,
            metadata: { bookingId: bookingRef.id }
        });
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating booking checkout session:', error);
        res.status(500).send({ error: "Failed to create checkout session" });
    }
});

// 3. Create Membership Checkout Session
export const createMembershipCheckoutSession = onRequest({ secrets: ['STRIPE_SECRET_KEY'], cors: true }, async (req, res) => {
    try {
        if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
        const { email, level, quantity = 1, userId } = req.body;
        const stripe = getStripe();
        const priceMap = { senior: 2500, individual: 3500, family: 5000, patron: 10000, corporate: 25000 };
        const unitAmount = priceMap[level as keyof typeof priceMap];
        if (!unitAmount) { res.status(400).send({ error: "Invalid membership level" }); return; }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `SAHS Membership - ${level.charAt(0).toUpperCase() + level.slice(1)}`,
                        description: `Membership dues for Senoia Area Historical Society`
                    },
                    unit_amount: unitAmount,
                },
                quantity,
            }],
            mode: 'payment',
            success_url: `${FRONTEND_URL}/support-sahs/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/support-sahs/cancel`,
            customer_email: email,
            metadata: { type: 'membership', level, quantity: quantity.toString(), userId: userId || '' }
        });
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating membership checkout session:', error);
        res.status(500).send({ error: "Failed to create membership checkout session" });
    }
});

// 4. Create Ticket Checkout Session
export const createTicketCheckoutSession = onRequest({ secrets: ['STRIPE_SECRET_KEY'], cors: true }, async (req, res) => {
    try {
        if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

        const { eventId, title, price, quantity, email, customerName } = req.body;

        if (!eventId || !title || !price || !quantity || !email) {
            res.status(400).send({ error: 'Missing required fields: eventId, title, price, quantity, email' });
            return;
        }

        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Tickets: ${title}`,
                        description: `Event tickets — Senoia Area Historical Society`
                    },
                    unit_amount: price,
                },
                quantity,
            }],
            mode: 'payment',
            // Dedicated ticket success page (not the generic membership one)
            success_url: `${FRONTEND_URL}/tickets/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/news/${req.body.slug || ''}`,
            customer_email: email,
            metadata: {
                type: 'ticket',
                eventId,
                eventTitle: title,
                customerName: customerName || '',
                quantity: quantity.toString(),
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
        const productsList = await stripe.products.list({ limit: 100, active: true });
        const productNameMap: Record<string, string> = {};
        productsList.data.forEach(p => { productNameMap[p.id] = p.name; });
        const subscriptions = await stripe.subscriptions.list({ status: 'all', expand: ['data.customer'], limit: 100 });
        const formattedMemberships = subscriptions.data.map(sub => {
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
export const stripeWebhook = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY'] }, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent((req as any).rawBody, sig as string, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const type = session.metadata?.type;

        if (type === 'membership') {
            const expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            try {
                await db.collection('memberships').add({
                    email: session.customer_email,
                    level: session.metadata?.level,
                    quantity: parseInt(session.metadata?.quantity || '1'),
                    status: 'active',
                    expirationDate,
                    paymentId: session.id,
                    userId: session.metadata?.userId || null,
                    updatedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error('Error creating membership record:', err);
            }

            // Send welcome email to new member via Resend
            if (session.customer_email) {
                const nameParts = (session.customer_details?.name || '').trim().split(/\s+/).filter(Boolean);
                const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] || '';
                sendWelcomeEmail(session.customer_email, firstName)
                    .catch(err => console.error('Resend welcome email failed:', err));
            }

        } else if (type === 'ticket') {
            try {
                const eventId = session.metadata?.eventId || '';
                const eventTitle = session.metadata?.eventTitle || '';
                const customerName = session.metadata?.customerName || '';
                const quantity = parseInt(session.metadata?.quantity || '1');
                const confirmationNumber = generateConfirmationNumber();

                // Generate QR code encoding the confirmation number
                const qrCode = await generateQRCode(confirmationNumber);

                // Write ticket record
                await db.collection('tickets').add({
                    eventId,
                    eventTitle,
                    customerName,
                    email: session.customer_email,
                    quantity,
                    totalAmount: session.amount_total || 0,
                    status: 'paid',
                    confirmationNumber,
                    qrCode,
                    stripeSessionId: session.id,
                    purchasedAt: new Date().toISOString(),
                });

                // Atomically increment ticketsSold on the event post
                if (eventId) {
                    await db.collection('posts').doc(eventId).update({
                        ticketsSold: FieldValue.increment(quantity),
                    });
                }
            } catch (err) {
                console.error('Error creating ticket record:', err);
            }

        } else {
            // Booking payment
            const bookingId = session.metadata?.bookingId;
            if (bookingId) {
                try {
                    await db.collection('bookings').doc(bookingId).update({
                        paymentIntentId: session.payment_intent as string,
                    });
                } catch (err) {
                    console.error('Error updating booking status:', err);
                }
            }
        }
    }

    res.json({ received: true });
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

// 8. Sync Confirmed Bookings to Google Calendar
export const onBookingConfirmed = onDocumentUpdated('bookings/{bookingId}', async (event) => {
    const newValue = event.data?.after.data();
    const previousValue = event.data?.before.data();
    if (!newValue || !previousValue) return;
    if (newValue.status === 'confirmed' && previousValue.status !== 'confirmed') {
        const auth = getCalendarAuth();
        try {
            const calendar = google.calendar({ version: 'v3', auth });
            const startDateTime = new Date(`${newValue.date}T${newValue.startTime}:00`).toISOString();
            const endDateTime = new Date(`${newValue.date}T${newValue.endTime}:00`).toISOString();
            const calendarEvent = {
                summary: `Meeting Room Booking: ${newValue.organization}`,
                description: `Contact: ${newValue.contactName} (${newValue.email})\nPurpose: ${newValue.purpose}`,
                start: { dateTime: startDateTime, timeZone: 'America/New_York' },
                end: { dateTime: endDateTime, timeZone: 'America/New_York' },
            };
            const response = await calendar.events.insert({ calendarId: CALENDAR_ID, requestBody: calendarEvent });
            await event.data?.after.ref.update({ googleCalendarEventId: response.data.id });
        } catch (error) {
            console.error('Error syncing to Calendar:', error);
        }
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
                    calendarId: CALENDAR_ID,
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
        
        // Case A: Newly published event (was not published, or newly created and published)
        if (isPublished && !wasPublished) {
            try {
                if (afterData.googleCalendarEventId) return;
                
                const startDateTime = afterData.eventDate 
                    ? new Date(afterData.eventDate.toDate()).toISOString() 
                    : (afterData.eventStartDate ? new Date(afterData.eventStartDate).toISOString() : new Date().toISOString());
                    
                const endDateTime = afterData.eventEndDate 
                    ? new Date(afterData.eventEndDate).toISOString() 
                    : new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
                
                const calendarEvent = {
                    summary: `SAHS Event: ${afterData.title}`,
                    description: afterData.excerpt || afterData.content?.replace(/<[^>]*>/g, '').substring(0, 300) || '',
                    location: afterData.location || afterData.eventLocation || '',
                    start: { dateTime: startDateTime, timeZone: 'America/New_York' },
                    end: { dateTime: endDateTime, timeZone: 'America/New_York' },
                };
                
                const response = await calendar.events.insert({
                    calendarId: CALENDAR_ID,
                    requestBody: calendarEvent
                });
                
                await event.data?.after.ref.update({
                    googleCalendarEventId: response.data.id
                });
            } catch (err) {
                console.error('Error creating Google Calendar event:', err);
            }
        }
        // Case B: Edited details of an already published event
        else if (isPublished && wasPublished && afterData.googleCalendarEventId) {
            try {
                const startDateTime = afterData.eventDate 
                    ? new Date(afterData.eventDate.toDate()).toISOString() 
                    : (afterData.eventStartDate ? new Date(afterData.eventStartDate).toISOString() : new Date().toISOString());
                    
                const endDateTime = afterData.eventEndDate 
                    ? new Date(afterData.eventEndDate).toISOString() 
                    : new Date(new Date(startDateTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
                
                await calendar.events.patch({
                    calendarId: CALENDAR_ID,
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
                    calendarId: CALENDAR_ID,
                    eventId: afterData.googleCalendarEventId
                });
                await event.data?.after.ref.update({
                    googleCalendarEventId: admin.firestore.FieldValue.delete()
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

        // Find all Stripe customers with this email
        const customers = await stripe.customers.search({ query: `email:"${email}"` });
        if (customers.data.length === 0) {
            res.json({ found: false, memberships: [] });
            return;
        }

        // Fetch product names once
        const productsList = await stripe.products.list({ limit: 100, active: true });
        const productMap = new Map(productsList.data.map(p => [p.id, p.name]));

        const memberships: object[] = [];
        for (const customer of customers.data) {
            const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all' });
            for (const sub of subs.data) {
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
            html = await render(React.createElement(WelcomeEmail, props as { firstName?: string }));
        } else if (template === 'newsletter') {
            html = await render(React.createElement(NewsletterEmail, props as unknown as NewsletterEmailProps));
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
