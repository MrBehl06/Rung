/**
 * The smallest router that does the job: two real paths, no dependency.
 *
 * `/`      the home page
 * `/app`   the tracker
 *
 * Real paths rather than hashes so the URLs are shareable and indexable.
 * That needs the host to serve index.html for unknown paths — Vite's dev
 * server does it by default, and vercel.json carries the rewrite for prod.
 */
export type Route = 'home' | 'app';

const APP_PATH = '/app';

export function currentRoute(): Route {
  const p = window.location.pathname.replace(/\/+$/, '');
  // honour the older hash links so an existing bookmark still lands correctly
  if (window.location.hash === '#app') return 'app';
  return p === APP_PATH ? 'app' : 'home';
}

export function navigate(route: Route): void {
  const path = route === 'app' ? APP_PATH : '/';
  if (window.location.pathname !== path || window.location.hash) {
    window.history.pushState(null, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** subscribe to back/forward and to navigate() */
export function onRouteChange(fn: () => void): () => void {
  window.addEventListener('popstate', fn);
  return () => window.removeEventListener('popstate', fn);
}
