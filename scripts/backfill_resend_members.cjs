#!/usr/bin/env node
/**
 * Backfills all active Stripe subscribers into a Resend Audience.
 * Safe to run multiple times — Resend upserts contacts by email.
 *
 * Usage:
 *   RESEND_API_KEY=re_... RESEND_AUDIENCE_ID=<id> STRIPE_SECRET_KEY=sk_... \
 *     node scripts/backfill_resend_members.cjs [--dry-run]
 */
const Stripe = require('../functions/node_modules/stripe');

const STRIPE_KEY      = process.env.STRIPE_SECRET_KEY;
const RESEND_KEY      = process.env.RESEND_API_KEY;
const AUDIENCE_ID     = process.env.RESEND_AUDIENCE_ID;
const DRY_RUN         = process.argv.includes('--dry-run');

if (!STRIPE_KEY)  { console.error('STRIPE_SECRET_KEY not set'); process.exit(1); }
if (!RESEND_KEY)  { console.error('RESEND_API_KEY not set');    process.exit(1); }
if (!AUDIENCE_ID) { console.error('RESEND_AUDIENCE_ID not set'); process.exit(1); }

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2023-10-16' });

function levelFromProduct(productName = '') {
  const n = productName.toLowerCase();
  if (n.includes('sustain')) return 'Sustaining';
  if (n.includes('family') && n.includes('senior')) return 'Family Senior';
  if (n.includes('family')) return 'Family';
  if (n.includes('senior')) return 'Individual Senior';
  if (n.includes('student')) return 'Student';
  if (n.includes('individual')) return 'Individual';
  return 'Member';
}

async function upsertContact(email, firstName, lastName, level) {
  if (DRY_RUN) {
    console.log(`  [dry-run] Would upsert: ${email} (${level})`);
    return;
  }
  const res = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      first_name: firstName || '',
      last_name: lastName || '',
      unsubscribed: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`  WARN upsert failed for ${email}: ${res.status} ${body.substring(0, 120)}`);
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Audience: ${AUDIENCE_ID}`);
  console.log('Fetching all active Stripe subscriptions...\n');

  let total = 0, synced = 0, skipped = 0;
  const seen = new Set();

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
    await upsertContact(email, firstName, lastName, level);
    console.log('ok');
    synced++;
  }

  console.log(`\nDone. Total subscriptions: ${total} | Synced: ${synced} | Skipped: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
