import type { Topic, TrackerState } from '../types';
import { getSprint } from '../data/sprints';
import { store } from '../lib/store';
import { toast } from '../lib/toasts';
import { XP_PER_REVISION } from '../lib/game';
import { SR_STEPS, daysUntilDue, dueLabel, reviewBuckets, stepDays } from '../lib/srs';
import { fmtDate } from '../lib/utils';
import { Icon } from '../components/Icons';
import { Badge, TypeTag } from '../components/primitives';
import { Empty, Meter, SHead, Tile } from '../components/hud';

function ReviewCard({ t, onOpen }: { t: Topic; onOpen: (id: string) => void }) {
  const due = daysUntilDue(t);
  const step = t.srStep ?? 0;
  const overdue = due !== null && due < 0;

  return (
    <div className={`rev-card ${overdue ? 'overdue' : ''}`}>
      <div className="rc-main">
        <button className="rc-name" onClick={() => onOpen(t.id)}>
          {t.name}
        </button>
        <div className="rc-meta">
          <TypeTag type={getSprint(t.sprint)?.short ?? t.sprint} />
          <span>{t.category}</span>
          <span className={`d-${t.difficulty}`}>{t.difficulty}</span>
          <Badge status={t.status} />
          <span className={overdue ? 'rc-due now' : 'rc-due'}>{dueLabel(due)}</span>
          {t.revisionCount ? <span className="dim">↻ {t.revisionCount}</span> : null}
        </div>
        <div className="rc-ladder">
          {SR_STEPS.map((d, i) => (
            <span key={d} className={`rung ${i <= step ? 'on' : ''}`} title={`${d} days`}>
              {d}d
            </span>
          ))}
        </div>
      </div>
      <div className="rc-acts">
        <button
          className="btn xs primary"
          title={`Next review in ${stepDays(step + 1)} days`}
          onClick={() => {
            const r = store.review(t.id, 'good');
            toast(`+${XP_PER_REVISION} XP · next in ${stepDays(r?.srStep ?? 0)}d`, 'ok');
          }}
        >
          Recalled
        </button>
        <button
          className="btn xs"
          title="Reset the ladder and review again tomorrow"
          onClick={() => {
            store.review(t.id, 'hard');
            toast('Reset to 1d — review again tomorrow', 'warn');
          }}
        >
          Struggled
        </button>
        <button className="btn xs ghost" title="Push out 3 days" onClick={() => store.snooze(t.id, 3)}>
          Snooze
        </button>
      </div>
    </div>
  );
}

export function Revision({ state, onOpen }: { state: TrackerState; onOpen: (id: string) => void }) {
  const { due, flagged, upcoming } = reviewBuckets(state);
  const totalRevisions = state.topics.reduce((n, t) => n + (t.revisionCount || 0), 0);
  const queue = [...flagged, ...due.filter((t) => !flagged.some((f) => f.id === t.id))];
  const scheduled = state.topics.filter((t) => t.srDue || t.status === 'Completed').length;
  const matured = state.topics.filter((t) => (t.srStep ?? 0) >= 4).length;
  const dueXp = queue.length * XP_PER_REVISION;

  return (
    <section className="view">
      <div className="bento">
        <div className="c3">
          <Tile
            k="Due now"
            v={queue.length}
            m={queue.length ? `${dueXp} XP waiting` : 'inbox zero'}
            cls={queue.length ? 'warn' : 'ok'}
            icon="↻"
          />
        </div>
        <div className="c3">
          <Tile k="Scheduled" v={scheduled} m="topics in rotation" cls="hld" icon="🗓" />
        </div>
        <div className="c3">
          <Tile
            k="Matured"
            v={matured}
            m="30d+ intervals"
            cls="ok"
            p={scheduled ? (matured / scheduled) * 100 : 0}
            icon="🌳"
          />
        </div>
        <div className="c3">
          <Tile k="Reviews logged" v={totalRevisions} m={`${totalRevisions * XP_PER_REVISION} XP earned`} cls="xp" icon="📚" />
        </div>
      </div>

      <div className="panel rail warn section">
        <div className="pad" style={{ paddingBottom: 4 }}>
          <SHead
            title="Review queue"
            sub={`recall walks the ladder · struggle resets it · +${XP_PER_REVISION} XP either way`}
          />
        </div>
        {queue.length ? (
          <div className="rev-list">
            {queue.map((t) => (
              <ReviewCard key={t.id} t={t} onOpen={onOpen} />
            ))}
          </div>
        ) : (
          <Empty
            icon="✨"
            title="Nothing due"
            msg="Everything you've completed is still inside its review interval. Come back when something matures."
          />
        )}
      </div>

      {upcoming.length ? (
        <div className="panel rail section">
          <div className="pad" style={{ paddingBottom: 4 }}>
            <SHead title="Coming up" sub={`next ${Math.min(upcoming.length, 12)} scheduled`} />
          </div>
          <div className="table-scroll">
            <table className="rev-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th className="hide-sm">Track</th>
                  <th>Interval</th>
                  <th>Due</th>
                  <th className="hide-sm">Last completed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {upcoming.slice(0, 12).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button className="rc-name" onClick={() => onOpen(t.id)}>
                        {t.name}
                      </button>
                    </td>
                    <td className="hide-sm mono dim">{t.category}</td>
                    <td className="mono">{stepDays(t.srStep ?? 0)}d</td>
                    <td className="mono dim">{dueLabel(daysUntilDue(t))}</td>
                    <td className="hide-sm mono dim">{fmtDate(t.dateCompleted)}</td>
                    <td className="nowrap">
                      <button className="btn xs ghost" title="Review now" onClick={() => onOpen(t.id)}>
                        <Icon name="edit" size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="panel rail ok pad section">
        <SHead title="How the ladder works" />
        <div className="rc-ladder" style={{ marginBottom: 10 }}>
          {SR_STEPS.map((d) => (
            <span key={d} className="rung on">
              {d}d
            </span>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
          Completing a topic schedules it 1 day out. Each clean recall moves it one rung — 1 → 3 → 7 → 14 → 30
          → 60 → 120 days. A struggle drops it back to the first rung and marks it Needs Revision, so weak
          topics come round fast and solid ones get out of your way.
        </p>
        <div style={{ marginTop: 12 }}>
          <Meter p={scheduled ? (matured / scheduled) * 100 : 0} cls="ok" seg />
          <span className="count-note" style={{ marginTop: 7, display: 'block' }}>
            {matured} of {scheduled} scheduled topics have matured past 30 days
          </span>
        </div>
      </div>
    </section>
  );
}
