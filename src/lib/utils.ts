/** Split a full name into first and last parts. */
export function splitName(fullName: string): { first: string; last: string } {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  const last = parts.pop()!;
  return { first: parts.join(' '), last };
}

/** Convert a post title to a URL-safe slug. */
export function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Prefer active Stripe subscriptions when the same email appears multiple times. */
const STATUS_RANK: Record<string, number> = { active: 0, past_due: 1, unpaid: 2, canceled: 3 };

export function deduplicateByEmail<T extends { email: string; status: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = item.email.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing || (STATUS_RANK[item.status] ?? 9) < (STATUS_RANK[existing.status] ?? 9)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

/** Format a Stripe subscription status for display. */
export function formatMembershipStatus(status: string, cancelAtPeriodEnd: boolean): string {
  if (status === 'active' && cancelAtPeriodEnd) return 'Active — Cancels at Period End';
  const labels: Record<string, string> = {
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
  };
  return labels[status] ?? status;
}
