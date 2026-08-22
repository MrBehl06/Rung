import { useRef } from 'react';
import type { DayDetail } from '../lib/calendar';
import type { TrackerState } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Icon } from './Icons';
import { DayNote } from './DayNote';

interface Props {
  detail: DayDetail;
  state: TrackerState;
  onClose: () => void;
  onOpenTopic: (id: string) => void;
}

const FULL = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function DayDrawer({ detail, state, onClose, onOpenTopic }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  // parse as local midnight so the label never slips a day across timezones
  const [y, m, d] = detail.date.split('-').map(Number);
  const title = FULL.format(new Date(y, m - 1, d));
  const linked = detail.completed.length + detail.revised.length + detail.due.length;

  return (
    <div className="drawer-ovl" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="dr-name">{title}</div>
            <div className="dr-meta">
              {detail.completed.length} completed · {detail.revised.length} revised
              {detail.due.length ? ` · ${detail.due.length} due` : ''}
            </div>
          </div>
          <button className="btn ghost icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div className="body">
          <div className="dr-block">
            <span className="fld-label">Plan</span>
            <DayNote date={detail.date} note={state.dayNotes[detail.date]} />
          </div>

          <div className="dr-block">
            <span className="fld-label">Linked topics</span>
            {linked ? (
              <div className="cal-list">
                {detail.completed.map((t) => (
                  <button key={`c${t.id}`} className="cal-item" onClick={() => onOpenTopic(t.id)}>
                    <span className="cal-mark ok" aria-hidden="true">✓</span>
                    {t.name}
                  </button>
                ))}
                {detail.revised.map((t) => (
                  <button key={`r${t.id}`} className="cal-item" onClick={() => onOpenTopic(t.id)}>
                    <span className="cal-mark" aria-hidden="true">↻</span>
                    {t.name}
                  </button>
                ))}
                {detail.due.map((t) => (
                  <button key={`d${t.id}`} className="cal-item" onClick={() => onOpenTopic(t.id)}>
                    <span className="cal-mark warn" aria-hidden="true">◷</span>
                    {t.name} <em className="muted">due</em>
                  </button>
                ))}
              </div>
            ) : (
              <p className="hint">Nothing completed, revised or scheduled on this day.</p>
            )}
            {detail.unaccounted > 0 ? (
              <p className="hint">
                +{detail.unaccounted} more completed this day, since re-completed elsewhere.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
