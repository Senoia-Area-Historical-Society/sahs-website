import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getDocs } from 'firebase/firestore';
import ContentAdmin from '../pages/admin/ContentAdmin';

/**
 * `/admin/content` renders every `posts` document, and those documents are not
 * shape-guaranteed — four different producers write them (the admin editor, the seed
 * scripts, the Cloud Functions, a one-time Webflow migration).
 *
 * `posts/N2B4Aq2bwjytBWPe7bVy` ("Yacht Rock Party") stores `updatedAt` as the ISO
 * string below rather than a `Timestamp`. The row rendered
 * `post.updatedAt?.toDate().toLocaleDateString()`; optional chaining guards null but
 * not the wrong type, so that threw `TypeError: updatedAt?.toDate is not a function`
 * during render. React unmounts the whole tree on a render throw, so the entire admin
 * content page was blank — for every user, on every post, on every visit.
 *
 * This renders the real component over a mixed-shape fixture. It fails on the old code.
 */

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({ db: {}, storage: {}, auth: {} }));
vi.mock('../services/storage', () => ({ uploadFile: vi.fn() }));
vi.mock('../services/api', () => ({ getVolunteerSheets: vi.fn().mockResolvedValue([]) }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'jeremywarren@senoiahistory.com' },
    isAdmin: true,
    isCurator: true,
    isEditor: true,
    isReadOnly: true,
    isSAHSUser: true,
    logout: vi.fn(),
  }),
}));

const timestamp = (iso: string) => ({
  toDate: () => new Date(iso),
  toMillis: () => Date.parse(iso),
});

const snapshotOf = (docs: Record<string, unknown>[]) => ({
  docs: docs.map(d => ({ id: d.id as string, data: () => d })),
});

describe('ContentAdmin date rendering', () => {
  beforeEach(() => {
    vi.mocked(getDocs).mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const renderList = async (docs: Record<string, unknown>[]) => {
    vi.mocked(getDocs).mockResolvedValue(snapshotOf(docs) as never);
    render(
      <MemoryRouter>
        <ContentAdmin />
      </MemoryRouter>
    );
    // The list is behind an async fetch; wait for the first row to land.
    await screen.findByText(docs[0].title as string, {}, { timeout: 3000 });
  };

  it('renders a post whose updatedAt is an ISO string instead of a Timestamp', async () => {
    await renderList([
      {
        id: 'N2B4Aq2bwjytBWPe7bVy',
        title: 'Yacht Rock Party',
        slug: 'yacht-rock-party-2026',
        status: 'published',
        author: 'jeremywarren@senoiahistory.com',
        eventDate: timestamp('2026-08-29T23:00:00.000Z'),
        createdAt: timestamp('2026-08-01T00:00:00.000Z'),
        updatedAt: '2026-08-25T04:13:41.139Z',
      },
    ]);

    expect(screen.getByText('Yacht Rock Party')).toBeInTheDocument();
  });

  it('renders the rest of the list when one document has a bad date field', async () => {
    await renderList([
      {
        id: 'good-1',
        title: 'A Visit with Dr. Gary McIntosh',
        status: 'published',
        eventDate: timestamp('2026-09-12T17:00:00.000Z'),
        createdAt: timestamp('2026-08-01T00:00:00.000Z'),
        updatedAt: timestamp('2026-09-05T00:00:00.000Z'),
      },
      { id: 'bad-1', title: 'Yacht Rock Party', status: 'published', updatedAt: '2026-08-25T04:13:41.139Z' },
      { id: 'bad-2', title: 'Nonsense Dates', status: 'draft', eventDate: 'not a date', updatedAt: { seconds: 1789000000 } },
      { id: 'bad-3', title: 'No Dates At All', status: 'draft' },
    ]);

    // Every row present: one malformed document no longer takes the page, or its
    // neighbours, down with it.
    ['A Visit with Dr. Gary McIntosh', 'Yacht Rock Party', 'Nonsense Dates', 'No Dates At All'].forEach(title =>
      expect(screen.getByText(title)).toBeInTheDocument()
    );

    // Exactly three: the two rows with no eventDate at all, plus `bad-2`, whose
    // eventDate is the unparseable string 'not a date'. That third one is the point —
    // the cell branches on whether the value *coerces*, not on whether it is truthy,
    // so an unusable date degrades to a placeholder rather than throwing.
    expect(screen.getAllByText('no date')).toHaveLength(3);
  });
});
