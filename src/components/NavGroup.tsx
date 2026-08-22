import type { ReactNode } from 'react';

interface Props {
  label: string;
  icon: string;
  /** the group's own row is the current page */
  active: boolean;
  expanded: boolean;
  /** collapsed icon-rail mode hides labels and children */
  rail: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  children: ReactNode;
}

export function NavGroup({ label, icon, active, expanded, rail, onToggle, onNavigate, children }: Props) {
  return (
    <div className="nav-group">
      <div className={`side-link nav-group-head ${active ? 'is-active' : ''}`}>
        <button
          className="nav-group-main"
          aria-current={active ? 'page' : undefined}
          title={rail ? label : undefined}
          onClick={onNavigate}
        >
          <span className="si" aria-hidden="true">{icon}</span>
          <span className="sl">{label}</span>
        </button>
        {!rail ? (
          <button
            className="nav-caret"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
            onClick={onToggle}
          >
            <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
          </button>
        ) : null}
      </div>
      {expanded && !rail ? <div className="nav-children">{children}</div> : null}
    </div>
  );
}
