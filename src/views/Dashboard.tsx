import type { TrackerState } from '../types';
import { getSprint } from '../data/sprints';
import { suggestNext } from '../lib/stats';
import { levelInfo } from '../lib/game';
import { store } from '../lib/store';
import { Empty } from '../components/hud';

interface Props {
  state: TrackerState;
  onOpen: (id: string) => void;
  onExport: () => void;
  onImport: () => void;
}

export function Dashboard({ state, onOpen, onExport, onImport }: Props) {
  const lv = levelInfo(state);
  const next = suggestNext(state, 5);
  const hasSprint = state.joinedSprints.length > 0;

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
