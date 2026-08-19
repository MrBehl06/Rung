import type { TrackerState } from '../types';
import { TEASERS } from '../data/sprints';
import { statsForSprint } from '../lib/stats';
import { joinedSprintDefs, unjoinedSprintDefs } from '../lib/scope';
import { store } from '../lib/store';
import { toast } from '../lib/toasts';
import { Empty, SHead } from '../components/hud';
import { SprintCard, TeaserCard } from '../components/SprintCard';

export function Sprints({ state }: { state: TrackerState }) {
  const joined = joinedSprintDefs(state);
  const available = unjoinedSprintDefs(state);

  const cardProps = {
    onOpen: (id: string) => store.openSprint(id),
    onJoin: (id: string) => store.joinSprint(id),
    onLeave: (id: string) => store.leaveSprint(id),
  };

  return (
    <section className="view">
      <SHead title="Interview sprints" sub="Pick what you are preparing for" />

      {joined.length ? (
        <div className="sprint-grid">
          {joined.map((def) => (
            <SprintCard key={def.id} def={def} stat={statsForSprint(state, def.id)} joined {...cardProps} />
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            icon="◈"
            title="No sprint selected"
            msg="Join a sprint below to start tracking. Nothing is lost when you leave one later — your XP, awards and streak are kept."
          />
        </div>
      )}

      <SHead title="Explore" sub="More tracks to add" />
      <div className="sprint-grid">
        {available.map((def) => (
          <SprintCard
            key={def.id}
            def={def}
            stat={statsForSprint(state, def.id)}
            joined={false}
            {...cardProps}
          />
        ))}
        {TEASERS.map((def) => (
          <TeaserCard
            key={def.id}
            def={def}
            onNudge={() => toast(`${def.name} is not live yet — HLD and LLD are ready today`, '', 3200)}
          />
        ))}
      </div>
    </section>
  );
}
