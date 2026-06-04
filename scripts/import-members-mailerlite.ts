/**
 * Import SAHS Stripe members directly into MailerLite via REST API.
 *
 * - Fetches live subscription data from the deployed Cloud Function
 * - Finds the "Members" group in MailerLite by name
 * - Upserts each subscriber with custom fields (level, status, expiry, Stripe ID)
 * - MailerLite status: active Stripe subs → "active"; all others → "active" too
 *   (Stripe status stored in membership_status field so campaigns can segment)
 *
 * Usage:
 *   MAILERLITE_API_KEY=your_key npx tsx scripts/import-members-mailerlite.ts
 *   MAILERLITE_API_KEY=your_key npx tsx scripts/import-members-mailerlite.ts --dry-run
 *   MAILERLITE_API_KEY=your_key npx tsx scripts/import-members-mailerlite.ts --active-only
 */

const CLOUD_FUNCTION_URL = 'https://us-central1-sahs-archives.cloudfunctions.net/listStripeSubscriptions';
const MAILERLITE_API = 'https://connect.mailerlite.com/api';
const MEMBERS_GROUP_NAME = 'Members';
const DELAY_MS = 300; // stay well under 120 req/min rate limit

const API_KEY = process.env.MAILERLITE_API_KEY;
if (!API_KEY) {
  console.error('Error: MAILERLITE_API_KEY environment variable is not set.');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const ACTIVE_ONLY = process.argv.includes('--active-only');

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
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  const last = parts.pop()!;
  return { first: parts.join(' '), last };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function mlFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${MAILERLITE_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MailerLite ${options.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function getOrCreateMembersGroup(): Promise<string> {
  const data = await mlFetch('/groups?limit=100');
  const groups: { id: string; name: string }[] = data.data || [];
  const existing = groups.find(g => g.name === MEMBERS_GROUP_NAME);
  if (existing) {
    console.log(`Found group "${MEMBERS_GROUP_NAME}" (id: ${existing.id})`);
    return existing.id;
  }
  if (DRY_RUN) {
    console.log(`[dry-run] Would create group "${MEMBERS_GROUP_NAME}"`);
    return 'dry-run-group-id';
  }
  const created = await mlFetch('/groups', {
    method: 'POST',
    body: JSON.stringify({ name: MEMBERS_GROUP_NAME }),
  });
  console.log(`Created group "${MEMBERS_GROUP_NAME}" (id: ${created.data.id})`);
  return created.data.id;
}

async function upsertSubscriber(member: Membership, groupId: string): Promise<'ok' | 'skip'> {
  const { first, last } = splitName(member.customerName || '');
  const expiryDate = member.expirationDate
    ? new Date(member.expirationDate).toISOString().split('T')[0]
    : '';

  const payload = {
    email: member.email.toLowerCase().trim(),
    fields: {
      name: first,
      last_name: last,
      membership_level: member.level,
      membership_status: member.status,
      expiration_date: expiryDate,
      stripe_subscription_id: member.id,
    },
    groups: [groupId],
    status: 'active',
  };

  if (DRY_RUN) {
    console.log(`  [dry-run] Would upsert: ${payload.email} (${member.level}, ${member.status})`);
    return 'ok';
  }

  await mlFetch('/subscribers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return 'ok';
}

async function main() {
  console.log('=== SAHS → MailerLite Member Import ===');
  if (DRY_RUN) console.log('DRY RUN — no changes will be made\n');
  if (ACTIVE_ONLY) console.log('ACTIVE ONLY — skipping non-active subscriptions\n');

  // 1. Fetch memberships from Cloud Function
  console.log('Fetching membership data from Stripe Cloud Function...');
  const res = await fetch(CLOUD_FUNCTION_URL);
  if (!res.ok) throw new Error(`Cloud Function returned ${res.status}: ${await res.text()}`);
  const allMembers: Membership[] = await res.json();
  console.log(`  Total subscriptions: ${allMembers.length}`);

  // Deduplicate by email — prefer active over canceled when same email has multiple subs
  const STATUS_RANK: Record<string, number> = { active: 0, past_due: 1, unpaid: 2, canceled: 3 };
  const emailMap = new Map<string, Membership>();
  for (const m of allMembers) {
    const key = m.email.toLowerCase().trim();
    const existing = emailMap.get(key);
    if (!existing || (STATUS_RANK[m.status] ?? 9) < (STATUS_RANK[existing.status] ?? 9)) {
      emailMap.set(key, m);
    }
  }
  const deduped = Array.from(emailMap.values());
  if (deduped.length < allMembers.length) {
    console.log(`  Deduplicated: ${allMembers.length - deduped.length} duplicate email(s) merged (kept active subscription)`);
  }

  const members = ACTIVE_ONLY ? deduped.filter(m => m.status === 'active') : deduped;
  if (ACTIVE_ONLY) console.log(`  After active filter: ${members.length}`);

  // Breakdown
  const byStatus = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1; return acc;
  }, {});
  console.log('  By status:', JSON.stringify(byStatus));

  const byLevel = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.level] = (acc[m.level] || 0) + 1; return acc;
  }, {});
  console.log('  By level:', JSON.stringify(byLevel));
  console.log();

  // 2. Get/create Members group
  const groupId = await getOrCreateMembersGroup();
  console.log();

  // 3. Upsert each subscriber
  console.log(`Upserting ${members.length} subscribers to MailerLite...`);
  let ok = 0, failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    try {
      await upsertSubscriber(member, groupId);
      ok++;
      if ((i + 1) % 10 === 0 || i === members.length - 1) {
        process.stdout.write(`\r  Progress: ${i + 1}/${members.length} (${ok} ok, ${failed} failed)`);
      }
    } catch (err: any) {
      failed++;
      errors.push(`${member.email}: ${err.message}`);
    }
    if (!DRY_RUN && i < members.length - 1) await sleep(DELAY_MS);
  }
  console.log();
  console.log();

  // 4. Summary
  console.log('=== Import Complete ===');
  console.log(`  Upserted: ${ok}`);
  console.log(`  Failed:   ${failed}`);
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  ✗ ${e}`));
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
