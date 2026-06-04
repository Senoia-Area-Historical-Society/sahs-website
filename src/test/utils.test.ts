import { describe, it, expect } from 'vitest';
import { splitName, titleToSlug, deduplicateByEmail, formatMembershipStatus } from '../lib/utils';

describe('splitName', () => {
  it('splits a standard first + last name', () => {
    expect(splitName('John Doe')).toEqual({ first: 'John', last: 'Doe' });
  });

  it('handles multi-word first names', () => {
    expect(splitName('Mary Jo Smith')).toEqual({ first: 'Mary Jo', last: 'Smith' });
  });

  it('returns single name as first with empty last', () => {
    expect(splitName('Madonna')).toEqual({ first: 'Madonna', last: '' });
  });

  it('returns empty strings for empty input', () => {
    expect(splitName('')).toEqual({ first: '', last: '' });
    expect(splitName('   ')).toEqual({ first: '', last: '' });
  });

  it('trims leading/trailing whitespace', () => {
    expect(splitName('  Jane Doe  ')).toEqual({ first: 'Jane', last: 'Doe' });
  });

  it('collapses multiple spaces between name parts', () => {
    expect(splitName('John   Doe')).toEqual({ first: 'John', last: 'Doe' });
  });
});

describe('titleToSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(titleToSlug('Hello World')).toBe('hello-world');
  });

  it('strips leading and trailing hyphens', () => {
    expect(titleToSlug(' Annual Meeting ')).toBe('annual-meeting');
  });

  it('collapses multiple punctuation into single hyphen', () => {
    expect(titleToSlug('SAHS: Annual — Gala 2025!')).toBe('sahs-annual-gala-2025');
  });

  it('handles numbers', () => {
    expect(titleToSlug('July 4th Family Day 2025')).toBe('july-4th-family-day-2025');
  });

  it('handles already-valid slugs', () => {
    expect(titleToSlug('already-a-slug')).toBe('already-a-slug');
  });
});

describe('deduplicateByEmail', () => {
  const makeEntry = (email: string, status: string) => ({ email, status, id: email + status });

  it('keeps a single entry unchanged', () => {
    const items = [makeEntry('user@example.com', 'active')];
    expect(deduplicateByEmail(items)).toHaveLength(1);
  });

  it('prefers active over canceled for the same email', () => {
    const items = [
      makeEntry('user@example.com', 'canceled'),
      makeEntry('user@example.com', 'active'),
    ];
    const result = deduplicateByEmail(items);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('active');
  });

  it('prefers active over past_due', () => {
    const items = [
      makeEntry('user@example.com', 'past_due'),
      makeEntry('user@example.com', 'active'),
    ];
    expect(deduplicateByEmail(items)[0].status).toBe('active');
  });

  it('prefers past_due over unpaid', () => {
    const items = [
      makeEntry('user@example.com', 'unpaid'),
      makeEntry('user@example.com', 'past_due'),
    ];
    expect(deduplicateByEmail(items)[0].status).toBe('past_due');
  });

  it('is case-insensitive on email', () => {
    const items = [
      makeEntry('User@Example.COM', 'canceled'),
      makeEntry('user@example.com', 'active'),
    ];
    expect(deduplicateByEmail(items)).toHaveLength(1);
    expect(deduplicateByEmail(items)[0].status).toBe('active');
  });

  it('keeps distinct emails separate', () => {
    const items = [
      makeEntry('alice@example.com', 'active'),
      makeEntry('bob@example.com', 'canceled'),
    ];
    expect(deduplicateByEmail(items)).toHaveLength(2);
  });

  it('handles unknown status as lowest priority', () => {
    const items = [
      makeEntry('user@example.com', 'unknown_status'),
      makeEntry('user@example.com', 'canceled'),
    ];
    // canceled has rank 3, unknown has rank 9 — canceled wins
    expect(deduplicateByEmail(items)[0].status).toBe('canceled');
  });

  it('returns empty array for empty input', () => {
    expect(deduplicateByEmail([])).toHaveLength(0);
  });
});

describe('formatMembershipStatus', () => {
  it('labels active correctly', () => {
    expect(formatMembershipStatus('active', false)).toBe('Active');
  });

  it('labels active + cancelAtPeriodEnd', () => {
    expect(formatMembershipStatus('active', true)).toBe('Active — Cancels at Period End');
  });

  it('labels past_due', () => {
    expect(formatMembershipStatus('past_due', false)).toBe('Past Due');
  });

  it('labels canceled', () => {
    expect(formatMembershipStatus('canceled', false)).toBe('Canceled');
  });

  it('labels unpaid', () => {
    expect(formatMembershipStatus('unpaid', false)).toBe('Unpaid');
  });

  it('passes unknown statuses through as-is', () => {
    expect(formatMembershipStatus('trialing', false)).toBe('trialing');
  });
});
