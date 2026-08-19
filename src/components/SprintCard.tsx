import type { Stat } from '../types';
import type { SprintDef, TeaserDef } from '../data/sprints';
import { Meter } from './hud';

interface Props {
  def: SprintDef;
  stat: Stat;
  joined: boolean;
  onOpen: (id: string) => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
}

export function SprintCard({ def, stat, joined, onOpen, onJoin, onLeave }: Props) {
  return (
    <article className="sprint-card" style={{ ['--sprint' as string]: def.accent }}>
      <header className="sprint-card-h">
        <span className="sprint-ico" aria-hidden="true">{def.icon}</span>
        <span className="sprint-id">
          <b>{def.name}</b>
          <small>{def.tagline}</small>
        </span>
        {joined ? <span className="sprint-live">active</span> : null}
      </header>

      <div className="sprint-num">
        <b>{stat.pct}%</b>
        <span>
          {stat.done} of {stat.total} cleared
        </span>
      </div>
      <Meter p={stat.pct} cls="sprint" />

      <dl className="sprint-break">
        <div>
          <dt>Active</dt>
          <dd>{stat.prog}</dd>
        </div>
        <div>
          <dt>To revise</dt>
          <dd>{stat.rev}</dd>
        </div>
        <div>
          <dt>Untouched</dt>
          <dd>{stat.todo}</dd>
        </div>
      </dl>

      <footer className="sprint-card-f">
        {joined ? (
          <>
            <button className="btn primary" onClick={() => onOpen(def.id)}>
              Open
            </button>
            <button className="btn ghost" onClick={() => onLeave(def.id)}>
              Leave
            </button>
          </>
        ) : (
          <button className="btn primary" onClick={() => onJoin(def.id)}>
            Join sprint
          </button>
        )}
      </footer>
    </article>
  );
}

/** A sprint with no content yet. Explains itself on click rather than doing nothing. */
export function TeaserCard({ def, onNudge }: { def: TeaserDef; onNudge: () => void }) {
  return (
    <button type="button" className="sprint-card is-locked" onClick={onNudge}>
      <header className="sprint-card-h">
        <span className="sprint-ico" aria-hidden="true">🔒</span>
        <span className="sprint-id">
          <b>{def.name}</b>
          <small>{def.blurb}</small>
        </span>
      </header>
      <span className="sprint-soon">coming soon</span>
    </button>
  );
}
