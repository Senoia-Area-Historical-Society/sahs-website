"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBookingConfirmed = exports.stripeWebhook = exports.createBookingCheckoutSession = exports.checkCalendarAvailability = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const stripe_1 = __importDefault(require("stripe"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
admin.initializeApp();
const db = admin.firestore();
// Use environment variables for sensitive data in production
// For now, these would need to be set or mocked
const CALENDAR_ID = 'c_188962a8uva3ijbpl6cdtc9621g6m@resource.calendar.google.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5175';
const getStripe = () => {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
    return new stripe_1.default(STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
    });
};
// Configure Google Auth for Calendar API
// In production, use a service account key JSON file
const credentials = require(path.resolve(__dirname, '../src/service-account.json'));
const getCalendarAuth = () => {
    return new googleapis_1.google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
    });
};
const corsHandler = (0, cors_1.default)({ origin: true });
// 1. Check Calendar Availability
exports.checkCalendarAvailability = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        var _a, _b;
        try {
            const { timeMin, timeMax } = req.body;
            if (!timeMin || !timeMax) {
                res.status(400).send({ error: "Missing timeMin or timeMax" });
                return;
            }
            const auth = getCalendarAuth();
            if (!auth) {
                // Mocking response if no auth is setup yet
                res.json({ busy: [] });
                return;
            }
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin,
                    timeMax,
                    items: [{ id: CALENDAR_ID }]
                }
            });
            const busy = ((_b = (_a = response.data.calendars) === null || _a === void 0 ? void 0 : _a[CALENDAR_ID]) === null || _b === void 0 ? void 0 : _b.busy) || [];
            res.json({ busy });
        }
        catch (error) {
            console.error('Error checking availability:', error);
            res.status(500).send({ error: "Failed to check availability" });
        }
    });
});
// 2. Create Stripe Checkout Session
exports.createBookingCheckoutSession = functions.runWith({ secrets: ['STRIPE_SECRET_KEY'] }).https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
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
                submittedAt: admin.firestore.FieldValue.serverTimestamp()
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
        }
        catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(500).send({ error: "Failed to create checkout session" });
        }
    });
});
// 3. Stripe Webhook Handler
exports.stripeWebhook = functions.runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] }).https.onRequest(async (req, res) => {
    var _a;
    const sig = req.headers['stripe-signature'];
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const bookingId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.bookingId;
        if (bookingId) {
            try {
                // Update booking to confirmed
                await db.collection('bookings').doc(bookingId).update({
                    status: 'confirmed',
                    paymentIntentId: session.payment_intent,
                });
                // Note: The onBookingConfirmed trigger will handle syncing to Calendar
            }
            catch (err) {
                console.error('Error updating booking status:', err);
            }
        }
    }
    res.json({ received: true });
});
// 4. Sync Confirmed Bookings to Google Calendar
exports.onBookingConfirmed = functions.firestore
    .document('bookings/{bookingId}')
    .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    // Only trigger if status changed to 'confirmed'
    if (newValue.status === 'confirmed' && previousValue.status !== 'confirmed') {
        const auth = getCalendarAuth();
        if (!auth) {
            console.log('Skipping Calendar sync - no auth configured');
            return null;
        }
        try {
            const calendar = googleapis_1.google.calendar({ version: 'v3', auth });
            // Convert date, startTime, endTime to ISO Strings for Calendar API
            // Assuming date is YYYY-MM-DD and time is HH:mm
            const startDateTime = new Date(`${newValue.date}T${newValue.startTime}:00`).toISOString();
            const endDateTime = new Date(`${newValue.date}T${newValue.endTime}:00`).toISOString();
            const event = {
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
                requestBody: event,
            });
            console.log('Event created:', response.data.htmlLink);
            // Save the Google Calendar Event ID back to the booking
            await change.after.ref.update({
                googleCalendarEventId: response.data.id
            });
            return null;
        }
        catch (error) {
            console.error('Error syncing to Calendar:', error);
            return null;
        }
    }
    return null;
});
//# sourceMappingURL=index.js.map