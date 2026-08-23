import { useRef } from 'react';
import type { PropsWithChildren, MouseEventHandler } from 'react';

/**
 * A card that lights up under the cursor.
 *
 * Adapted from React Bits' SpotlightCard (reactbits.dev, MIT). The original
 * hardcodes a dark palette; this version drives everything from CSS custom
 * properties so it works in both themes. Kept dependency-free — the effect is
 * a radial gradient positioned from two CSS variables the pointer updates.
 */
interface Props extends PropsWithChildren {
  className?: string;
}

export function SpotlightCard({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove: MouseEventHandler<HTMLDivElement> = (e) => {
    const node = ref.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    node.style.setProperty('--mx', `${e.clientX - r.left}px`);
    node.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div ref={ref} onMouseMove={onMouseMove} className={`spot ${className}`}>
      {children}
    </div>
  );
}
