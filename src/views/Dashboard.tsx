import type { TrackerState } from '../types';
import { getSprint } from '../data/sprints';
import { suggestNext } from '../lib/stats';
import { levelInfo } from '../lib/game';
import { reviewBuckets } from '../lib/srs';
import { activeTopics } from '../lib/scope';
import { parseNote } from '../lib/daynotes';
import { store } from '../lib/store';
import { todayISO } from '../lib/utils';
import { Empty } from '../components/hud';

interface Props {
  state: TrackerState;
  onOpen: (id: string) => void;
  onGo: (v: 'revision' | 'calendar') => void;
  onExport: () => void;
  onImport: () => void;
}

export function Dashboard({ state, onOpen, onGo, onExport, onImport }: Props) {
  const lv = levelInfo(state);
  const hasSprint = state.joinedSprints.length > 0;

  // retention beats coverage — if anything is due, it outranks starting something new
  const buckets = reviewBuckets(state, undefined, activeTopics(state));
  const due = [...buckets.flagged, ...buckets.due];

  // anything already listed as due must not reappear under "pick up"
  const dueIds = new Set(due.map((t) => t.id));
  const next = suggestNext(state, 8)
    .filter((t) => !dueIds.has(t.id))
    .slice(0, 5);

  // whatever you planned for today, so the plan is not one click out of sight
  const today = todayISO();
  const note = state.dayNotes[today];
  const open = note
    ? parseNote(note.text, note.checked).filter((l) => l.checkable && !l.checked)
    : [];

  return (
    <section className="view base">
      <div className="base-lv">
        <span className="base-rank">{lv.rank}</span>
        <span className="base-n">{lv.level}</span>
        <span className="base-bar">
          <i style={{ width: `${lv.pct}%` }} />
        </span>
        <span className="base-xp">
          {lv.into} / {lv.span} XP
        </span>
      </div>

      {due.length ? (
        <div className="base-next base-due">
          <button className="base-lbl as-lbl" onClick={() => onGo('revision')}>
            due for review <em>{due.length}</em>
          </button>
          {due.slice(0, 4).map((t) => (
            <button key={t.id} className="base-row" onClick={() => onOpen(t.id)}>
              <span className="base-row-n">{t.name}</span>
              <span className="base-row-m">{getSprint(t.sprint)?.short}</span>
              <span className="base-row-c" aria-hidden="true">›</span>
            </button>
          ))}
          {due.length > 4 ? (
            <button className="base-more" onClick={() => onGo('revision')}>
              {due.length - 4} more in Review →
            </button>
          ) : null}
        </div>
      ) : null}

      {open.length ? (
        <div className="base-next">
          <button className="base-lbl as-lbl" onClick={() => onGo('calendar')}>
            today
          </button>
          {open.map((l) => (
            <label key={l.index} className="base-todo">
              <input
                type="checkbox"
                checked={false}
                onChange={() => store.toggleDayLine(today, l.index)}
              />
              <span>{l.text}</span>
            </label>
          ))}
        </div>
      ) : null}

      {hasSprint ? (
        <div className="base-next">
          <span className="base-lbl">pick up</span>
          {next.length ? (
            next.map((t) => (
              <button key={t.id} className="base-row" onClick={() => onOpen(t.id)}>
                <span className="base-row-n">{t.name}</span>
                <span className="base-row-m">{getSprint(t.sprint)?.short}</span>
                <span className="base-row-c" aria-hidden="true">›</span>
              </button>
            ))
          ) : (
            <p className="muted">Everything in your sprints is done.</p>
          )}
        </div>
      ) : (
        <div className="panel">
          <Empty
            icon="◈"
            title="No sprint yet"
            msg="Join one from Sprints and your next topics will show up here."
          />
        </div>
      )}

      {/* mobile only — the sidebar footer is unreachable without the drawer */}
      <div className="base-actions only-mobile">
        <button className="btn ghost" onClick={onExport}>Export</button>
        <button className="btn ghost" onClick={onImport}>Import</button>
        <button
          className="btn ghost"
          onClick={() => store.setTheme(state.ui.theme === 'dark' ? 'light' : 'dark')}
        >
          Theme
        </button>
      </div>
    </section>
  );
}
