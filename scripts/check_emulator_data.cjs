const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function check() {
    console.log('Connecting to emulator at 127.0.0.1:8080...');
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

    const app = initializeApp({
        projectId: 'sahs-archives'
    });

    const db = getFirestore(app);

    try {
        console.log('Checking (default) database...');
        const bookings = await db.collection('bookings').get();
        console.log(`Bookings count: ${bookings.size}`);
        bookings.forEach(doc => console.log(` - Booking ${doc.id}: status=${doc.data().status}, email=${doc.data().email}`));

        const memberships = await db.collection('memberships').get();
        console.log(`Memberships count: ${memberships.size}`);
        memberships.forEach(doc => console.log(` - Membership ${doc.id}: level=${doc.data().level}, email=${doc.data().email}`));
        
        const tickets = await db.collection('tickets').get();
        console.log(`Tickets count: ${tickets.size}`);
        tickets.forEach(doc => console.log(` - Ticket ${doc.id}: eventId=${doc.data().eventId}, email=${doc.data().email}`));

    } catch (err) {
        console.error('Error during check:', err);
    }
}

check();
