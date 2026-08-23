import type { TrackerState } from '../types';
import { getSprint } from '../data/sprints';
import { statsForSprint, suggestNext, todayTally } from '../lib/stats';
import { levelInfo } from '../lib/game';
import { reviewBuckets } from '../lib/srs';
import { completionStreak, weekProgress } from '../lib/streak';
import { activeTopics, joinedSprintDefs } from '../lib/scope';
import { parseNote } from '../lib/daynotes';
import { store } from '../lib/store';
import { todayISO } from '../lib/utils';
import { Empty } from '../components/hud';

/** half-finished topics surfaced above the pick-up list */
const IN_FLIGHT_SHOWN = 3;

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
  const today = todayISO();

  // retention beats coverage — if anything is due, it outranks starting something new
  const buckets = reviewBuckets(state, undefined, activeTopics(state));
  const due = [...buckets.flagged, ...buckets.due];

  // the rest of this page is debt; this is the one part that reports back
  const day = todayTally(state, today);
  const week = weekProgress(state);
  const streak = completionStreak(state);
  const hasRhythm = streak > 0 || week.hit > 0 || day.logged > 0;

  // a topic must appear in exactly one group, and the earlier group wins
  const shown = new Set(due.map((t) => t.id));

  // work in flight is easy to lose inside "pick up", where it looks untouched
  const inFlight = activeTopics(state)
    .filter((t) => t.status === 'In Progress' && !shown.has(t.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, IN_FLIGHT_SHOWN);
  for (const t of inFlight) shown.add(t.id);

  const next = suggestNext(state, 8)
    .filter((t) => !shown.has(t.id))
    .slice(0, 5);

  // whatever you planned for today, so the plan is not one click out of sight
  const note = state.dayNotes[today];
  const open = note
    ? parseNote(note.text, note.checked).filter((l) => l.checkable && !l.checked)
    : [];

  const coverage = joinedSprintDefs(state).map((def) => ({
    def,
    stat: statsForSprint(state, def.id),
  }));

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

      {hasRhythm ? (
        <div className="base-today">
          <div className="base-streak">
            <span className="base-streak-n">{streak}</span>
            <span className="base-streak-l">day{streak === 1 ? '' : 's'} in a row</span>
          </div>

          <div className="base-week">
            <span className="base-week-top">
              <span>this week</span>
              <b className={week.done ? 'done' : ''}>
                {week.hit}/{week.target}
              </b>
            </span>
            <span
              className="base-dots"
              aria-label={`${week.hit} of ${week.target} days this week`}
            >
              {week.days.map((on, i) => (
                <i key={i} className={on ? 'on' : ''} />
              ))}
            </span>
          </div>

          {day.logged || day.revised ? (
            <p className="base-tally">
              {day.logged ? <span>{day.logged} completed</span> : null}
              {day.revised ? <span>{day.revised} revised</span> : null}
              <em>+{day.xp} XP today</em>
            </p>
          ) : null}
        </div>
      ) : null}

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

      {inFlight.length ? (
        <div className="base-next">
          <span className="base-lbl">in flight</span>
          {inFlight.map((t) => (
            <button key={t.id} className="base-row" onClick={() => onOpen(t.id)}>
              <span className="base-row-n">{t.name}</span>
              <span className="base-row-m">{getSprint(t.sprint)?.short}</span>
              <span className="base-row-c" aria-hidden="true">›</span>
            </button>
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

      {coverage.length ? (
        <div className="base-next">
          <span className="base-lbl">coverage</span>
          {coverage.map(({ def, stat }) => (
            <button
              key={def.id}
              className="base-cov"
              style={{ ['--sprint' as string]: def.accent }}
              onClick={() => store.openSprint(def.id)}
            >
              <span className="base-cov-n">{def.name}</span>
              <span className="base-cov-m">
                {stat.done} of {stat.total}
              </span>
              <span className="base-cov-p">{stat.pct}%</span>
              <span className="base-cov-bar">
                <i style={{ width: `${stat.pct}%` }} />
              </span>
            </button>
          ))}
        </div>
      ) : null}

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
