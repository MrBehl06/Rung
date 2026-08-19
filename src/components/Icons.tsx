/** One sprite mounted once at the root; every icon is a <use href="#i-…"/>. */
export function IconSprite() {
  return (
    <svg className="hidden" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <symbol id="i-check" viewBox="0 0 16 16">
          <path fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" d="M2.5 8.5l3.5 3.5 7.5-8" />
        </symbol>
        <symbol id="i-search" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="7" cy="7" r="4.6" />
            <path d="M10.4 10.4L14 14" />
          </g>
        </symbol>
        <symbol id="i-caret" viewBox="0 0 16 16">
          <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 6.5l4 4 4-4" />
        </symbol>
        <symbol id="i-edit" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.4 2.6l2 2L6 12H4v-2z" />
            <path d="M2.5 14.2h11" />
          </g>
        </symbol>
        <symbol id="i-trash" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.8 4.2h10.4M6.4 4.2V2.8h3.2v1.4M4.2 4.2l.6 9h6.4l.6-9" />
          </g>
        </symbol>
        <symbol id="i-revise" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13.2 8a5.2 5.2 0 1 1-1.6-3.75" />
            <path d="M13.4 2.2v3h-3" />
          </g>
        </symbol>
        <symbol id="i-reset" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.75" />
            <path d="M2.6 2.2v3h3" />
          </g>
        </symbol>
        <symbol id="i-note" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 4.5h8M4 8h8M4 11.5h5" />
          </g>
        </symbol>
        <symbol id="i-plus" viewBox="0 0 16 16">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M8 3.2v9.6M3.2 8h9.6" />
        </symbol>
        <symbol id="i-x" viewBox="0 0 16 16">
          <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M4 4l8 8M12 4l-8 8" />
        </symbol>
        <symbol id="i-sun" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="8" cy="8" r="3.1" />
            <path d="M8 1.4v1.6M8 13v1.6M1.4 8h1.6M13 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
          </g>
        </symbol>
        <symbol id="i-moon" viewBox="0 0 16 16">
          <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.9 5.9 0 1 0 7 7z" />
        </symbol>
        <symbol id="i-download" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v8" />
            <path d="M4.8 7.2L8 10.4l3.2-3.2" />
            <path d="M2.8 13.2h10.4" />
          </g>
        </symbol>
        <symbol id="i-upload" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 10.4V2.4" />
            <path d="M4.8 5.6L8 2.4l3.2 3.2" />
            <path d="M2.8 13.2h10.4" />
          </g>
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 16 16">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h10" />
            <path d="M9.2 4.2L13 8l-3.8 3.8" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

export function Icon({ name, size = 14, className, style }: {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} className={className} style={style} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
