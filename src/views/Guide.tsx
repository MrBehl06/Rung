import type { Stats, TrackerState } from '../types';
import type { QuestState } from '../lib/game';
import { QUEST_BONUS, XP_BY_DIFF, XP_PER_REVISION, levelInfo, xpToReach } from '../lib/game';
import { KEY, PERSISTENT, Storage } from '../lib/storage';
import { store } from '../lib/store';
import { Icon } from '../components/Icons';
import { SHead } from '../components/hud';

export function Guide({
  state,
  stats: s,
  quests,
  onImport,
}: {
  state: TrackerState;
  stats: Stats;
  quests: QuestState;
  onImport: () => void;
}) {
  const lv = levelInfo(state);

  return (
    <section className="view">
      <div className="panel rail pad guide section">
        <SHead title="How the game works" sub="React + TypeScript · no backend" />

        <h3>Earning XP</h3>
        <p>XP is derived from your progress, never stored — so it always matches reality.</p>
        <div className="xp-table">
          <div className="x">
            <b>+{XP_BY_DIFF.Easy}</b>
            <span>Easy</span>
          </div>
          <div className="x">
            <b>+{XP_BY_DIFF.Medium}</b>
            <span>Medium</span>
          </div>
          <div className="x">
            <b>+{XP_BY_DIFF.Hard}</b>
            <span>Hard</span>
          </div>
          <div className="x">
            <b>+{XP_PER_REVISION}</b>
            <span>Revision</span>
          </div>
          <div className="x">
            <b>+{QUEST_BONUS}</b>
            <span>Quest clear</span>
          </div>
        </div>
        <p>
          You are level <strong>{lv.level}</strong> ({lv.rank}) with{' '}
          <strong>{lv.xp.toLocaleString()} XP</strong>. Level {lv.level + 1} needs{' '}
          {xpToReach(lv.level + 1).toLocaleString()} total — {lv.toNext.toLocaleString()} to go.
          Today's board holds {quests.total} quest{quests.total === 1 ? '' : 's'} worth {quests.xp} XP.
        </p>

        <h3>Ranks</h3>
        <p>
          Levels map to rank titles: Initiate → Novice → Practitioner → Journeyman → Senior → Architect →
          Distinguished. Clearing the whole catalogue lands around level 13.
        </p>

        <h3>Skill paths</h3>
        <p>
          Each track unlocks the next once you clear 40% of it. Locked tracks are still visible and still
          clickable — the lock is a suggested route, not a wall.
        </p>

        <h3>Where your data lives</h3>
        <p>
          Everything is written to your browser's <code>localStorage</code> under <code>{KEY}</code> — one JSON
          blob holding topics, quests, history and UI state. There is no server and no account, so the data
          never leaves your machine.
        </p>
        <ul>
          <li>Saved synchronously on every change — closing the tab right after a click is safe.</li>
          <li>Two open tabs stay in sync via the <code>storage</code> event.</li>
          <li>Storage is scoped per origin — the deployed URL and localhost keep separate copies.</li>
          <li>
            Current driver: <code>{Storage.mode}</code>
            {PERSISTENT ? '' : ' — this frame blocks storage, so changes are not persisting'}
          </li>
        </ul>

        <h3>Backups</h3>
        <p>
          <strong>Export</strong> downloads <code>hld-lld-tracker-YYYY-MM-DD.json</code>. Commit it to a repo and
          you get free version history. <strong>Import</strong> replaces current data.
        </p>
        <div className="row wrap" style={{ gap: 8, margin: '12px 0 4px' }}>
          <button className="btn primary" onClick={() => store.exportData()}>
            <Icon name="download" size={12} />
            Export backup
          </button>
          <button className="btn" onClick={onImport}>
            <Icon name="upload" size={12} />
            Import backup
          </button>
          <button className="btn danger" onClick={() => store.wipe()}>
            <Icon name="trash" size={12} />
            Reset everything
          </button>
        </div>

        <h3>Catalogue</h3>
        <p>
          {s.all.total} topics tracked — HLD {s.hld.total} and LLD {s.lld.total}. Progress is never hard-coded:
        </p>
        <pre>{`HLD %     = completed HLD topics / total HLD topics
LLD %     = completed LLD topics / total LLD topics
Overall % = completed topics      / total topics`}</pre>
        <p>
          Editing <code>src/data/seed.ts</code> and redeploying keeps your progress: new topics are merged in,
          topics you deleted stay deleted, statuses you set are never overwritten.
        </p>

        <h3>Keyboard</h3>
        <div className="cmdgrid">
          <code>⌘K / Ctrl K</code>
          <span className="muted">command bar</span>
          <code>/</code>
          <span className="muted">focus search</span>
          <code>N</code>
          <span className="muted">new topic</span>
          <code>1–7</code>
          <span className="muted">switch tabs</span>
          <code>Esc</code>
          <span className="muted">close dialog</span>
        </div>

        <h3>Console API</h3>
        <p>
          The same code paths the UI uses are on <code>window.tracker</code>, so the console (or an agent) can
          drive the app.
        </p>
        <pre>{`tracker.run('completed Parking Lot')  // plain-English command
tracker.level()                       // { level, rank, xp, toNext, … }
tracker.awards()                      // achievements + progress
tracker.stats()                       // { all, hld, lld, patterns, … }
tracker.next(5)                       // ranked "study next" list
tracker.streak()                      // current streak in days
tracker.topics() | tracker.data()
tracker.complete|start|revise|revised|reset|remove('<fuzzy name>')
tracker.add({ name, type, category, difficulty, status, notes })
tracker.move('Singleton', 'Behavioral Patterns')
tracker.today.add('Kafka') | tracker.today.carry()
tracker.export() | tracker.wipe()`}</pre>
      </div>
    </section>
  );
}
