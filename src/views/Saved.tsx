import type { TrackerState } from '../types';
import { SPRINTS, getSprint } from '../data/sprints';
import { store } from '../lib/store';
import { Empty, SHead } from '../components/hud';
import { TopicCard } from '../components/TopicCard';

interface Props {
  state: TrackerState;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}

/** Everything you starred, across every sprint — joined or not. */
export function Saved({ state, onOpen, onEdit }: Props) {
  const saved = state.topics.filter((t) => t.bookmarked);

  // group by sprint so a mixed list still reads as organised
  const groups = SPRINTS.map((sp) => ({
    sp,
    items: saved.filter((t) => t.sprint === sp.id),
  })).filter((g) => g.items.length);

  return (
    <section className="view">
      <SHead title="Saved" sub={saved.length ? `${saved.length} starred` : undefined} />

      {groups.length ? (
        groups.map(({ sp, items }) => (
          <div className="panel cat-block" key={sp.id} style={{ ['--sprint' as string]: sp.accent }}>
            <div className="cat-head static">
              <h3>
                <span aria-hidden="true">{sp.icon}</span> {getSprint(sp.id)?.name}
              </h3>
              <span className="cnt">{items.length}</span>
            </div>
            <div className="tgrid">
              {items.map((t) => (
                <TopicCard
                  key={t.id}
                  topic={t}
                  onOpen={onOpen}
                  onEdit={onEdit}
                  onSelect={() => store.toggleBookmark(t.id)}
                  showCategory
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="panel">
          <Empty
            icon="★"
            title="Nothing saved yet"
            msg="Star a topic from any sprint and it collects here, so the things you flagged are never more than one click away."
          />
        </div>
      )}
    </section>
  );
}
