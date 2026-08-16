/**
 * Writes dist/sitemap.xml after `vite build`.
 *
 * The site is a client-rendered SPA, so crawlers never see the in-app links to
 * /news/:slug and /historic-structures-and-places/:slug. Without this file those
 * pages are undiscoverable.
 *
 * Reads Firestore through the public client SDK (published posts and historical
 * places are public-read) rather than firebase-admin, because CI authenticates to
 * GCP only after the build step — the VITE_* config is all that exists at this point.
 *
 * Fail-soft by contract: the static routes below are always written, dynamic slugs
 * are added only if Firestore answers, and nothing here exits non-zero. A Firestore
 * hiccup must never break a production deploy.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://senoiahistory.com';
const OUT = resolve(ROOT, 'dist/sitemap.xml');
const FETCH_TIMEOUT_MS = 30_000;

// Public, indexable routes from src/App.tsx. Post-checkout, volunteer-token, and
// admin routes are intentionally absent — they're disallowed in public/robots.txt.
const STATIC_ROUTES = [
  ['/', 1.0],
  ['/about-sahs', 0.8],
  ['/senoia-stories', 0.8],
  ['/location-and-hours', 0.9],
  ['/carmichael-house', 0.8],
  ['/filming-in-senoia', 0.9],
  ['/contact-sahs', 0.7],
  ['/news', 0.9],
  ['/box-office', 0.7],
  ['/support-sahs', 0.8],
  ['/supporters', 0.5],
  ['/meeting-room', 0.7],
  ['/vendor-application-form', 0.4],
  ['/historic-structures-and-places', 0.9],
  ['/media', 0.6],
  ['/past-sahs-events', 0.6],
  ['/privacy-policy', 0.3],
];

/** Vite reads .env itself; a plain node script has to ask for it. */
function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // CI supplies VITE_* directly; a missing or malformed .env is not fatal.
    }
  }
}

async function fetchDynamicRoutes() {
  const { projectId, apiKey } = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    apiKey: process.env.VITE_FIREBASE_API_KEY,
  };
  if (!projectId || !apiKey) {
    console.warn('[sitemap] No Firebase config in env — writing static routes only.');
    return [];
  }

  const { initializeApp } = await import('firebase/app');
  const { getFirestore, collection, query, where, getDocs, terminate } = await import(
    'firebase/firestore'
  );

  // Default database — the website's own. The archive-app's named `sahs-archives`
  // database is a separate target and must not be read here.
  const db = getFirestore(initializeApp({ projectId, apiKey }, 'sitemap'));

  try {
    return await withTimeout(readSlugs(db, { collection, query, where, getDocs }), FETCH_TIMEOUT_MS);
  } finally {
    // The Firestore client holds an open gRPC stream that keeps the Node event loop
    // alive; without this the build hangs after the sitemap is written.
    await terminate(db).catch(() => {});
  }
}

async function readSlugs(db, { collection, query, where, getDocs }) {
  const routes = [];

  const posts = await getDocs(
    query(collection(db, 'posts'), where('status', '==', 'published'))
  );
  for (const doc of posts.docs) {
    const { slug, updatedAt, createdAt } = doc.data();
    if (slug) routes.push([`/news/${slug}`, 0.7, toISODate(updatedAt ?? createdAt)]);
  }

  const places = await getDocs(query(collection(db, 'historical_places')));
  for (const doc of places.docs) {
    const { slug, updatedAt, createdAt } = doc.data();
    if (slug) {
      routes.push([
        `/historic-structures-and-places/${slug}`,
        0.7,
        toISODate(updatedAt ?? createdAt),
      ]);
    }
  }

  return routes;
}

/**
 * Firestore retries transport failures indefinitely rather than rejecting, so an
 * unreachable backend or a rules change would otherwise stall the build forever.
 */
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Firestore fetch timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Firestore Timestamps expose toDate(); legacy docs may hold an ISO string or nothing. */
function toISODate(value) {
  try {
    if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    }
  } catch {
    // fall through
  }
  return undefined;
}

/**
 * ContentAdmin restricts slugs to [a-z0-9-], but historical_places has no such
 * admin-side sanitizer and scripts/ write to Firestore directly. One unescaped
 * `&` would make the whole document invalid XML — Google rejects a malformed
 * sitemap wholesale, and this script is fail-soft, so nothing would flag it.
 */
function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = routes
    .map(([path, priority, lastmod]) =>
      [
        '  <url>',
        `    <loc>${escapeXml(ORIGIN + path)}</loc>`,
        `    <lastmod>${lastmod ?? today}</lastmod>`,
        `    <priority>${priority.toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n')
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

async function main() {
  loadEnv();

  let dynamicRoutes = [];
  try {
    dynamicRoutes = await fetchDynamicRoutes();
  } catch (err) {
    console.warn(`[sitemap] Firestore fetch failed (${err.message}) — static routes only.`);
  }

  const routes = [...STATIC_ROUTES, ...dynamicRoutes];
  writeFileSync(OUT, renderSitemap(routes));
  console.log(
    `[sitemap] Wrote ${routes.length} URLs to dist/sitemap.xml ` +
      `(${STATIC_ROUTES.length} static, ${dynamicRoutes.length} dynamic).`
  );
}

main()
  .catch((err) => {
    // Last-resort guard: a broken sitemap must not fail the deploy.
    console.warn(`[sitemap] Skipped: ${err.message}`);
  })
  .finally(() => {
    // The file is already written synchronously, so exiting here is safe. Firestore
    // can leave a gRPC handle open that terminate() doesn't always release — without
    // this the build would hang indefinitely instead of finishing.
    process.exit(0);
  });
