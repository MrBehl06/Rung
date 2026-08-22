import { useEffect, useMemo, useState } from 'react';
import type { TrackerState } from '../types';
import { dayDetail, monthConsistency, monthGrid, monthLabel } from '../lib/calendar';
import { todayISO } from '../lib/utils';
import { SHead } from '../components/hud';
import { DayNote } from '../components/DayNote';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({ state, onOpen }: { state: TrackerState; onOpen: (id: string) => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [picked, setPicked] = useState<string | null>(todayISO());

  const cells = useMemo(() => monthGrid(state, year, month), [state, year, month]);
  const detail = useMemo(() => (picked ? dayDetail(state, picked) : null), [state, picked]);
  const consistency = monthConsistency(state, year, month);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(input|textarea|select)$/i.test(el.tagName)) return;
      if (document.querySelector('.ovl, .drawer-ovl')) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const d = new Date(year, month + (e.key === 'ArrowRight' ? 1 : -1), 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        const d = new Date();
        setYear(d.getFullYear());
        setMonth(d.getMonth());
        setPicked(todayISO());
      } else if (e.key === 'Escape') {
        setPicked(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [year, month]);

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setPicked(todayISO());
  }

  const label = monthLabel(year, month);

  return (
    <section className="view cal">
      <div className="bento">
        <div className="c7">
        <div className="panel pad">
        <SHead
          title={label}
          sub={consistency == null ? undefined : `${consistency}% active`}
          right={
            <span className="cal-nav">
              <button className="btn xs ghost" aria-label="Previous month" onClick={() => shift(-1)}>
                ◀
              </button>
              <button className="btn xs ghost" onClick={goToday}>
                Today
              </button>
              <button className="btn xs ghost" aria-label="Next month" onClick={() => shift(1)}>
                ▶
              </button>
            </span>
          }
        />

        <div className="cal-dow" aria-hidden="true">
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="cal-grid" role="grid" aria-label={label}>
          {cells.map((c) => (
            <button
              key={c.date}
              type="button"
              role="gridcell"
              className={`cal-c ${c.inMonth ? '' : 'out'} ${picked === c.date ? 'sel' : ''}`}
              data-l={c.level}
              data-today={c.isToday ? 1 : 0}
              aria-label={`${c.date}: ${c.completions} completed${c.dueReviews ? `, ${c.dueReviews} due` : ''}${c.hasNote ? ', has a note' : ''}`}
              onClick={() => setPicked(c.date)}
            >
              <span className="cal-n">{Number(c.date.slice(8))}</span>
              {c.isFuture && c.dueReviews ? <span className="cal-due">◷{c.dueReviews}</span> : null}
              {c.hasNote ? <span className="cal-dot" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
        </div>
        </div>

        <div className="c5">
      {detail ? (
        <div className="panel pad" style={{ height: '100%' }}>
          <SHead
            title={detail.date}
            sub={`${detail.completed.length} completed · ${detail.revised.length} revised`}
          />
          <DayNote date={detail.date} note={state.dayNotes[detail.date]} />

          {detail.completed.length || detail.revised.length || detail.due.length ? (
            <span className="dn-linked-lbl">linked</span>
          ) : null}
          <div className="cal-list">
            {detail.completed.map((t) => (
              <button key={`c${t.id}`} className="cal-item" onClick={() => onOpen(t.id)}>
                <span className="cal-mark ok" aria-hidden="true">✓</span>
                {t.name}
              </button>
            ))}
            {detail.revised.map((t) => (
              <button key={`r${t.id}`} className="cal-item" onClick={() => onOpen(t.id)}>
                <span className="cal-mark" aria-hidden="true">↻</span>
                {t.name}
              </button>
            ))}
            {detail.due.map((t) => (
              <button key={`d${t.id}`} className="cal-item" onClick={() => onOpen(t.id)}>
                <span className="cal-mark warn" aria-hidden="true">◷</span>
                {t.name} <em className="muted">due</em>
              </button>
            ))}
          </div>
          {detail.unaccounted > 0 ? (
            <p className="muted cal-note">
              +{detail.unaccounted} more completed this day, since re-completed elsewhere
            </p>
          ) : null}
        </div>
      ) : null}
        </div>
      </div>
    </section>
  );
}
