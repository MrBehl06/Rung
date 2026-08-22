import { useEffect, useMemo, useState } from 'react';
import type { TrackerState } from '../types';
import { dayDetail, monthConsistency, monthGrid, monthLabel } from '../lib/calendar';
import { completionStreak, longestStreak, weekProgress } from '../lib/streak';
import { todayISO } from '../lib/utils';
import { SHead } from '../components/hud';
import { DayDrawer } from '../components/DayDrawer';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({ state, onOpen }: { state: TrackerState; onOpen: (id: string) => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [picked, setPicked] = useState<string | null>(null);

  const cells = useMemo(() => monthGrid(state, year, month), [state, year, month]);
  const detail = useMemo(() => (picked ? dayDetail(state, picked) : null), [state, picked]);
  const consistency = monthConsistency(state, year, month);
  const streak = completionStreak(state);
  const best = Math.max(streak, longestStreak(state));
  const week = weekProgress(state);
  const activeDays = Object.values(state.history).filter((n) => n > 0).length;

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
      <div className="streaks">
        <div className="streak-main">
          <span className="streak-n">{streak}</span>
          <span className="streak-lbl">
            day{streak === 1 ? '' : 's'} in a row
            {best > streak ? <em> · best {best}</em> : null}
          </span>
        </div>

        <div className="streak-week">
          <span className="streak-week-top">
            <span>this week</span>
            <b className={week.done ? 'done' : ''}>
              {week.hit}/{week.target}
            </b>
          </span>
          <span className="streak-dots">
            {week.days.map((on, i) => (
              <i key={i} className={on ? 'on' : ''} />
            ))}
          </span>
        </div>

        <dl className="streak-stats">
          <div>
            <dt>Active days</dt>
            <dd>{activeDays}</dd>
          </div>
          <div>
            <dt>This month</dt>
            <dd>{consistency == null ? '—' : `${consistency}%`}</dd>
          </div>
        </dl>
      </div>

      <div className="panel pad">
        <SHead
          title={label}
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

      {detail ? (
        <DayDrawer
          detail={detail}
          state={state}
          onClose={() => setPicked(null)}
          onOpenTopic={onOpen}
        />
      ) : null}
    </section>
  );
}
