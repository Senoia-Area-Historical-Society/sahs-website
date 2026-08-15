/**
 * Extract plain text from CMS-authored HTML (TipTap content).
 * Uses DOMParser rather than a regex strip: single-pass regexes like
 * `.replace(/<[^>]*>?/g, '')` are incomplete sanitizers (e.g. `<<script>script>`
 * survives one pass), which CodeQL flags as js/incomplete-multi-character-sanitization.
 * DOMParser never executes scripts and handles malformed markup correctly.
 */
export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent ?? '';
}

/** Plain-text excerpt of a post's HTML content, truncated with an ellipsis. */
export function excerptFromHtml(html: string | undefined, maxLength: number): string {
  if (!html) return '';
  const text = stripHtml(html).trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
