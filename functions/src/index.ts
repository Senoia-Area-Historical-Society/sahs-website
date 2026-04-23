import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import Stripe from 'stripe';
import * as path from 'path';

admin.initializeApp();
const db = admin.firestore();

// Use environment variables for sensitive data in production
const CALENDAR_ID = 'c_188962a8uva3ijbpl6cdtc9621g6m@resource.calendar.google.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://senoiahistory.com';

const getStripe = () => {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
    return new Stripe(STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
    });
};

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
            requestBody: {
                timeMin,
                timeMax,
                items: [{ id: CALENDAR_ID }]
            }
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
        if (req.method !== 'POST') {
             res.status(405).send('Method Not Allowed');
             return;
        }

        const { organization, contactName, email, date, startTime, endTime, purpose } = req.body;
        
        // Create a pending booking in Firestore BEFORE checkout so we have an ID
        const bookingRef = await db.collection('bookings').add({
            organization,
            contactName,
            email,
            date,
            startTime,
            endTime,
            purpose,
            status: 'pending',
            submittedAt: FieldValue.serverTimestamp()
        });

        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Meeting Room Booking',
                            description: `Booking for ${organization} on ${date} from ${startTime} to ${endTime}`,
                        },
                        unit_amount: 5000, // $50.00 mock price
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${FRONTEND_URL}/meeting-room/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/meeting-room/cancel`,
            client_reference_id: bookingRef.id,
            customer_email: email,
            metadata: {
                bookingId: bookingRef.id
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).send({ error: "Failed to create checkout session" });
    }
});

// 3. Create Membership Checkout Session
export const createMembershipCheckoutSession = onRequest({ secrets: ['STRIPE_SECRET_KEY'], cors: true }, async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { email, level, quantity = 1, userId } = req.body;
        const stripe = getStripe();
        
        // Define prices based on levels (in cents)
        const priceMap = {
            senior: 2500,
            individual: 3500,
            family: 5000,
            patron: 10000,
            corporate: 25000
        };

        const unitAmount = priceMap[level as keyof typeof priceMap];
        if (!unitAmount) {
            res.status(400).send({ error: "Invalid membership level" });
            return;
        }

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
                quantity: quantity,
            }],
            mode: 'payment',
            success_url: `${FRONTEND_URL}/support-sahs/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/support-sahs/cancel`,
            customer_email: email,
            metadata: {
                type: 'membership',
                level,
                quantity: quantity.toString(),
                userId: userId || ''
            }
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
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { eventId, title, price, quantity, email } = req.body;
        const stripe = getStripe();

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { 
                        name: `Tickets: ${title}`,
                        description: `Event tickets for Senoia Area Historical Society`
                    },
                    unit_amount: price,
                },
                quantity,
            }],
            mode: 'payment',
            success_url: `${FRONTEND_URL}/support-sahs/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/support-sahs/cancel`,
            customer_email: email,
            metadata: {
                type: 'ticket',
                eventId,
                quantity: quantity.toString()
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
        if (req.method !== 'GET' && req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const stripe = getStripe();
        
        // 1. Fetch all products to have a name mapping
        const productsList = await stripe.products.list({ limit: 100, active: true });
        const productNameMap: Record<string, string> = {};
        productsList.data.forEach(p => {
            productNameMap[p.id] = p.name;
        });

        // 2. Fetch subscriptions
        const subscriptions = await stripe.subscriptions.list({
            status: 'all', // Fetch all statuses (active, past_due, canceled, etc.)
            expand: ['data.customer'],
            limit: 100,
        });

        const formattedMemberships = subscriptions.data.map(sub => {
            const customer = sub.customer as Stripe.Customer;
            const item = sub.items.data[0];
            const plan = item.plan;
            const productId = typeof plan.product === 'string' ? plan.product : (plan.product as any).id;

            // Resolve level name from map, then plan nickname, then ID
            const level = productNameMap[productId] || plan.nickname || 'Unknown Level';

            return {
                id: sub.id,
                email: customer.email || 'No Email',
                customerName: customer.name || 'Unknown',
                level: level,
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
export const stripeWebhook = onRequest({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] }, async (req, res) => {
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
            try {
                await db.collection('memberships').add({
                    email: session.customer_email,
                    level: session.metadata?.level,
                    quantity: parseInt(session.metadata?.quantity || '1'),
                    status: 'active',
                    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    paymentId: session.id,
                    userId: session.metadata?.userId || null,
                    updatedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error('Error creating membership record:', err);
            }
        } else if (type === 'ticket') {
            try {
                const confirmationNumber = Math.random().toString(36).substring(2, 10).toUpperCase();
                await db.collection('tickets').add({
                    eventId: session.metadata?.eventId,
                    email: session.customer_email,
                    quantity: parseInt(session.metadata?.quantity || '1'),
                    status: 'paid',
                    confirmationNumber,
                    purchasedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error('Error creating ticket record:', err);
            }
        } else {
            // Default booking logic
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

// 6. Sync Confirmed Bookings to Google Calendar
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
                start: {
                    dateTime: startDateTime,
                    timeZone: 'America/New_York',
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: 'America/New_York',
                },
            };

            const response = await calendar.events.insert({
                calendarId: CALENDAR_ID,
                requestBody: calendarEvent,
            });

            await event.data?.after.ref.update({
                 googleCalendarEventId: response.data.id
            });
        } catch (error) {
            console.error('Error syncing to Calendar:', error);
        }
    }
});
