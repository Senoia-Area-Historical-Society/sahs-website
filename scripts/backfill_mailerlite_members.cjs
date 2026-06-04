#!/usr/bin/env node
/**
 * Backfills all active Stripe subscribers into the MailerLite "Members" group.
 * Safe to run multiple times — MailerLite upserts by email.
 *
 * Usage: node scripts/backfill_mailerlite_members.cjs [--dry-run]
 */
const Stripe = require('../functions/node_modules/stripe');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const MAILERLITE_KEY = process.env.MAILERLITE_API_KEY;
const MAILERLITE_GROUP_ID = '189313952612615392';
const DRY_RUN = process.argv.includes('--dry-run');

if (!STRIPE_KEY) { console.error('STRIPE_SECRET_KEY not set'); process.exit(1); }
if (!MAILERLITE_KEY) { console.error('MAILERLITE_API_KEY not set'); process.exit(1); }

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2023-10-16' });

// Normalize product name → membership level label
function levelFromProduct(productName = '') {
  const n = productName.toLowerCase();
  if (n.includes('sustain')) return 'Sustaining';
  if (n.includes('family') && n.includes('senior')) return 'Family Senior';
  if (n.includes('family')) return 'Family';
  if (n.includes('senior')) return 'Individual Senior'; // check before student ("seniors or students")
  if (n.includes('student')) return 'Student';
  if (n.includes('individual')) return 'Individual';
  return 'Member';
}

async function upsertMailerLite(email, firstName, lastName, level) {
  if (DRY_RUN) {
    console.log(`  [dry-run] Would upsert: ${email} (${level})`);
    return;
  }
  const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILERLITE_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      email,
      fields: {
        name: firstName || '',
        last_name: lastName || '',
        membership_level: level,
        membership_status: 'active',
      },
      groups: [MAILERLITE_GROUP_ID],
      status: 'active',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`  WARN upsert failed for ${email}: ${res.status} ${body.substring(0, 120)}`);
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('Fetching all active Stripe subscriptions...\n');

  let total = 0, synced = 0, skipped = 0;
  const seen = new Set(); // deduplicate by email

  // Cache product names to avoid repeat fetches
  const productCache = {};
  async function getProductName(productId) {
    if (!productId || typeof productId !== 'string') return '';
    if (productCache[productId]) return productCache[productId];
    try {
      const p = await stripe.products.retrieve(productId);
      productCache[productId] = p.name || '';
    } catch { productCache[productId] = ''; }
    return productCache[productId];
  }

  for await (const sub of stripe.subscriptions.list({
    status: 'active',
    limit: 100,
    expand: ['data.customer', 'data.items.data.price'],
  })) {
    total++;
    const customer = sub.customer;
    if (typeof customer === 'string' || !customer || customer.deleted) { skipped++; continue; }

    const email = customer.email;
    if (!email) { skipped++; continue; }
    if (seen.has(email)) { skipped++; continue; }
    seen.add(email);

    const name = customer.name || '';
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const item = sub.items?.data?.[0];
    const productId = typeof item?.price?.product === 'string'
      ? item.price.product
      : item?.price?.product?.id;
    const productName = await getProductName(productId);
    const level = levelFromProduct(productName);

    process.stdout.write(`[${total}] ${email} — ${level} ... `);
    await upsertMailerLite(email, firstName, lastName, level);
    console.log('✓');
    synced++;

    // Rate limit: MailerLite allows ~120 req/min
    await new Promise(r => setTimeout(r, 550));
  }

  console.log(`\nDone. Total: ${total} | Synced: ${synced} | Skipped: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
