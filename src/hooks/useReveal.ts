import { useEffect, useRef } from 'react';

/**
 * Content must never be permanently hidden if the observer never fires — but
 * this is a last resort, not a timeout. Too short and it reveals whole sections
 * before the reader has scrolled to them, which throws the effect away.
 */
const SAFETY_MS = 4000;

/**
 * Reveal an element the first time it scrolls into view.
 *
 * The hidden state is applied by JS (`armed`), never by CSS alone — otherwise
 * a failed script or an observer that never fires would leave the content
 * invisible for good. A safety timer reveals it regardless after a beat.
 */
export function useReveal<T extends HTMLElement>(): React.RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || typeof IntersectionObserver === 'undefined') return;

    node.classList.add('armed');
    const show = () => node.classList.add('in');

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          show();
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );
    io.observe(node);

    const safety = setTimeout(show, SAFETY_MS);
    return () => {
      clearTimeout(safety);
      io.disconnect();
    };
  }, []);

  return ref;
}
