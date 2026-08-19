import { useState } from 'react';
import { getSprint } from '../data/sprints';
import type { TrackerState } from '../types';
import { completionStreak, suggestNext } from '../lib/stats';
import { MAX_TODAY, store } from '../lib/store';
import { toast } from '../lib/toasts';
import { longestStreak, questState, xpFor } from '../lib/game';
import { fmtDate, todayISO } from '../lib/utils';
import { Icon } from '../components/Icons';
import { Empty, Heatmap, Meter, SHead, Tile } from '../components/hud';
import { TopicRow } from '../components/TopicRow';

export function Today({
  state,
  onEdit,
  onOpen,
}: {
  state: TrackerState;
  onEdit: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [pick, setPick] = useState('');
  const [custom, setCustom] = useState('');

  const items = state.today.items;
  const q = questState(state);
  const streak = completionStreak(state);
  const best = Math.max(streak, longestStreak(state));
  const suggestions = suggestNext(state, 4).filter((t) => !items.some((i) => i.topicId === t.id));

  const pickable = state.topics
    .filter((t) => t.status !== 'Completed')
    .sort(
      (a, b) =>
        a.sprint.localeCompare(b.sprint) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    );

  return (
    <section className="view">
      <div className="bento">
        <div className="c3">
          <Tile
            k="Quests cleared"
            v={`${q.done}/${q.total}`}
            m={q.total ? 'today' : 'nothing accepted'}
            cls="ok"
            p={q.total ? (q.done / q.total) * 100 : 0}
            icon="⚔"
          />
        </div>
        <div className="c3">
          <Tile k="XP on the board" v={q.xp} m={`+${q.bonus} clear bonus`} cls="xp" icon="⚡" />
        </div>
        <div className="c3">
          <Tile k="Streak" v={`${streak}d`} m={`best ${best}d`} cls="fire" icon="🔥" />
        </div>
        <div className="c3">
          <Tile k="Slots left" v={Math.max(0, MAX_TODAY - items.length)} m={`cap ${MAX_TODAY}/day`} icon="🎯" />
        </div>
      </div>

      <div className="bento">
        <div className="c7">
          <div className="panel rail xp" style={{ height: '100%' }}>
            <div className="pad" style={{ paddingBottom: 6 }}>
              <SHead
                title="Quest board"
                sub={state.today.date === todayISO() ? fmtDate(state.today.date) : `planned · ${fmtDate(state.today.date)}`}
              />
              <div style={{ marginBottom: 4 }}>
                <Meter p={q.total ? (q.done / q.total) * 100 : 0} cls="ok" seg />
              </div>
            </div>

            {items.length ? (
              <div>
                {items.map((it) => {
                  const t = it.topicId ? state.topics.find((x) => x.id === it.topicId) : null;
                  return (
                    <div className="quest" key={it.id} data-done={it.done ? 1 : 0}>
                      <button
                        className="chk"
                        data-on={it.done ? 1 : 0}
                        aria-label={`toggle ${it.text}`}
                        onClick={() => store.toggleTodayDone(it.id)}
                      >
                        <Icon name="check" size={12} />
                      </button>
                      <div>
                        <div className="q-t">
                          {it.text}
                          {it.carried ? <span className="tag" style={{ marginLeft: 7 }}>carried</span> : null}
                        </div>
                        <div className="q-m">
                          {t ? `${getSprint(t.sprint)?.short} · ${t.category} · ${t.difficulty}` : 'custom objective'}
                        </div>
                      </div>
                      <div className="row">
                        <span className="q-xp">+{t ? xpFor(t) : 10}</span>
                        {t ? (
                          <button className="btn xs ghost" title="Edit topic" onClick={() => onEdit(t.id)}>
                            <Icon name="edit" size={12} />
                          </button>
                        ) : null}
                        <button className="btn xs danger" title="Abandon quest" onClick={() => store.removeToday(it.id)}>
                          <Icon name="trash" size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {q.complete ? (
                  <div className="q-bonus">
                    <span style={{ fontSize: 20 }} aria-hidden="true">🏆</span>
                    <b>Board cleared — nice run</b>
                    <span className="spacer" />
                    <span className="q-xp">+{q.bonus} bonus XP</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <Empty icon="🗺" title="No quests accepted" msg="Pick up to 5 topics below — small, finishable chunks work best." />
            )}
          </div>
        </div>

        <div className="c5">
          <div className="panel rail pad" style={{ height: '100%' }}>
            <SHead title="Accept a quest" />
            <div className="row wrap" style={{ gap: 8 }}>
              <select
                aria-label="Add an existing topic"
                style={{ flex: 1, minWidth: 180 }}
                value={pick}
                onChange={(e) => setPick(e.target.value)}
              >
                <option value="">Choose a topic…</option>
                {pickable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {getSprint(t.sprint)?.short} · {t.name} — {t.category}
                  </option>
                ))}
              </select>
              <button
                className="btn primary"
                onClick={() => {
                  if (!pick) {
                    toast('Pick a topic first', 'warn');
                    return;
                  }
                  if (store.addToday(pick)) setPick('');
                }}
              >
                <Icon name="plus" size={12} />
                Accept
              </button>
            </div>

            <div className="row wrap" style={{ gap: 8, marginTop: 9 }}>
              <input
                type="text"
                placeholder="…or a custom objective"
                style={{ flex: 1, minWidth: 180 }}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && custom.trim()) {
                    store.addToday(custom.trim());
                    setCustom('');
                  }
                }}
              />
              <button
                className="btn"
                onClick={() => {
                  if (custom.trim()) {
                    store.addToday(custom.trim());
                    setCustom('');
                  }
                }}
              >
                Add
              </button>
            </div>

            <div className="row wrap" style={{ gap: 8, marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--line)' }}>
              <button className="btn" onClick={() => store.carryToTomorrow()}>
                <Icon name="arrow" size={12} />
                Carry unfinished
              </button>
              <button className="btn ghost" onClick={() => store.clearTodayDone()}>
                Clear cleared
              </button>
            </div>
            <p className="hint">Unfinished quests carry over automatically when the date rolls.</p>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <SHead title="Last 20 weeks" />
              <Heatmap state={state} weeks={14} />
            </div>
          </div>
        </div>
      </div>

      {suggestions.length ? (
        <div className="panel rail ok section">
          <div className="pad" style={{ paddingBottom: 4 }}>
            <SHead title="Suggested contracts" sub="based on what's unfinished" />
          </div>
          <div className="tlist">
            {suggestions.map((t) => (
              <TopicRow key={t.id} topic={t} onEdit={onEdit} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
