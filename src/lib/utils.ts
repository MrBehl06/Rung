export const uid = (): string => 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const todayISO = (d: Date = new Date()): string => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
  return z.toISOString().slice(0, 10);
};

export const nowISO = (): string => new Date().toISOString();

/** loose normalisation used by search + fuzzy topic matching */
export const norm = (s: unknown): string =>
  String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const pct = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 100) : 0);

export const slug = (s: unknown): string =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const daysAgo = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 864e5);
};

/**
 * Accept a pasted URL only if it is http(s).
 *
 * `javascript:` and `data:` URLs are executable when placed in an href, so an
 * unvalidated link would be a real XSS hole in a page that renders them.
 * Returns null when the input cannot be trusted.
 */
export function safeUrl(input: string): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  // bare domains are common when pasting, so assume https rather than rejecting
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/** hostname without the www, for labelling a link the user did not name */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
