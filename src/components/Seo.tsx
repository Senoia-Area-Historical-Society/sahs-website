import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Senoia Area Historical Society';
const ORIGIN = 'https://senoiahistory.com';
const DEFAULT_IMAGE = `${ORIGIN}/images/carmichael-house-drawing.jpg`;

interface SeoProps {
  /** Page-specific part of the title; the site name is appended automatically. */
  title: string;
  description: string;
  /** Absolute URL. Falls back to the Carmichael House drawing. */
  image?: string;
  /** Set on pages that shouldn't appear in search results at all. */
  noindex?: boolean;
}

/**
 * Sets per-page title and meta tags.
 *
 * This updates the tags already present in index.html rather than rendering new
 * ones through React 19's native metadata hoisting, which would append a second
 * <title> and <meta name="description"> alongside the static defaults and leave
 * crawlers to guess which one counts.
 *
 * Only affects clients that execute JavaScript, so it reaches Googlebot's render
 * pass and the browser tab (which AnalyticsTracker reports as page_title), but
 * NOT social-card scrapers — those read the raw HTML and keep seeing the static
 * defaults from index.html. Per-page social cards need prerendering.
 */
export default function Seo({ title, description, image, noindex }: SeoProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    const canonical = `${ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;

    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', image ?? DEFAULT_IMAGE);
    setLink('canonical', canonical);

    if (noindex) {
      setMeta('name', 'robots', 'noindex');
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove();
    }
  }, [title, description, image, noindex, pathname]);

  return null;
}

function setMeta(keyAttr: 'name' | 'property', key: string, value: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${keyAttr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(keyAttr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

function setLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}
