/**
 * Export SAHS membership list as MailerLite-ready CSV.
 *
 * Fetches live subscription data from the deployed Cloud Function,
 * splits names into first/last, and writes a CSV with MailerLite's
 * expected column headers.
 *
 * Usage:
 *   npx tsx scripts/export-members-mailerlite.ts
 *   npx tsx scripts/export-members-mailerlite.ts --active-only
 *
 * Output: members-mailerlite-YYYY-MM-DD.csv (in sahs-website root)
 */

import { writeFileSync } from 'fs';

const FUNCTION_URL = 'https://us-central1-sahs-archives.cloudfunctions.net/listStripeSubscriptions';

interface Membership {
  id: string;
  email: string;
  customerName?: string;
  level: string;
  status: string;
  expirationDate: string;
  createdAt?: string;
  quantity: number;
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = (fullName || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  const last = parts.pop()!;
  return { first: parts.join(' '), last };
}

function escapeCSV(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

async function main() {
  const activeOnly = process.argv.includes('--active-only');

  console.log('Fetching membership data from Stripe...');
  const res = await fetch(FUNCTION_URL);
  if (!res.ok) throw new Error(`Cloud Function returned ${res.status}: ${await res.text()}`);

  const memberships: Membership[] = await res.json();
  console.log(`  Total subscriptions: ${memberships.length}`);

  const filtered = activeOnly
    ? memberships.filter(m => m.status === 'active')
    : memberships;

  if (activeOnly) console.log(`  Active only: ${filtered.length}`);

  // MailerLite import columns:
  // email, name (or first_name + last_name), and any custom fields
  const headers = ['email', 'first_name', 'last_name', 'name', 'membership_level', 'membership_status', 'expiration_date', 'stripe_subscription_id'];

  const rows = filtered.map(m => {
    const { first, last } = splitName(m.customerName || '');
    const expiry = m.expirationDate ? new Date(m.expirationDate).toLocaleDateString('en-US') : '';
    return [
      m.email,
      first,
      last,
      m.customerName || '',
      m.level,
      m.status,
      expiry,
      m.id,
    ].map(escapeCSV).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  const today = new Date().toISOString().split('T')[0];
  const filename = `members-mailerlite-${today}.csv`;
  writeFileSync(filename, csv, 'utf-8');

  console.log(`\nExported ${filtered.length} members → ${filename}`);

  // Summary by status
  const byStatus = filtered.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});
  console.log('\nBreakdown by status:');
  Object.entries(byStatus).sort().forEach(([s, n]) => console.log(`  ${s}: ${n}`));

  // Summary by level
  const byLevel = filtered.reduce<Record<string, number>>((acc, m) => {
    acc[m.level] = (acc[m.level] || 0) + 1;
    return acc;
  }, {});
  console.log('\nBreakdown by membership level:');
  Object.entries(byLevel).sort().forEach(([l, n]) => console.log(`  ${l}: ${n}`));
}

main().catch(err => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
