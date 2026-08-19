import type { Stats, TopicType, TrackerState, ViewId } from '../types';
import { CATS } from '../data/seed';
import { completionStreak, suggestNext } from '../lib/stats';
import { achievements, levelInfo, longestStreak, questState, skillTree, xpFor } from '../lib/game';
import { store } from '../lib/store';
import { AchCard, Empty, HeroHud, Heatmap, Meter, Ring, SHead, SkillTree, Tile } from '../components/hud';
import { TopicRow } from '../components/TopicRow';
import { TypeTag } from '../components/primitives';

export function Dashboard({
  state,
  stats: s,
  onEdit,
  onOpen,
  onGo,
}: {
  state: TrackerState;
  stats: Stats;
  onEdit: (id: string) => void;
  onOpen: (id: string) => void;
  onGo: (v: ViewId) => void;
}) {
  const lv = levelInfo(state);
  const streak = completionStreak(state);
  const best = Math.max(streak, longestStreak(state));
  const quests = questState(state);
  const ach = achievements(state);
  const unlocked = ach.filter((a) => a.unlocked);
  const next = suggestNext(state, 5);
  const hldTree = skillTree(state, 'HLD', CATS.HLD);
  const lldTree = skillTree(state, 'LLD', CATS.LLD);

  // closest-to-done locked achievements make good "next targets"
  const nearly = ach
    .filter((a) => !a.unlocked && a.cur > 0)
    .sort((a, b) => b.cur / b.target - a.cur / a.target)
    .slice(0, 4);

  function pickCat(cat: string, type: TopicType) {
    store.switchView(type.toLowerCase() as ViewId);
    store.setFilters({ category: cat, type, q: '', status: 'all', difficulty: 'all' });
  }

  return (
    <section className="view">
      <HeroHud
        lv={lv}
        stats={s}
        streak={streak}
        best={best}
        questDone={quests.done}
        questTotal={quests.total}
        unlockedCount={unlocked.length}
        totalAch={ach.length}
      />

      {/* ---- vitals row ---- */}
      <div className="bento">
        <div className="c3">
          <Tile k="HLD" v={`${s.hld.pct}%`} m={`${s.hld.done}/${s.hld.total} cleared`} cls="hld" p={s.hld.pct} icon="🏗" />
        </div>
        <div className="c3">
          <Tile k="LLD" v={`${s.lld.pct}%`} m={`${s.lld.done}/${s.lld.total} cleared`} cls="lld" p={s.lld.pct} icon="🔬" />
        </div>
        <div className="c3">
          <Tile
            k="Patterns"
            v={`${s.patterns.done}/${s.patterns.total}`}
            m={`${s.patterns.pct}% of the grimoire`}
            cls="ok"
            p={s.patterns.pct}
            icon="🧩"
          />
        </div>
        <div className="c3">
          <Tile
            k="Bosses"
            v={s.problems.done}
            m={`${s.problems.total - s.problems.done} problems remain`}
            cls="warn"
            p={s.problems.pct}
            icon="⚔"
          />
        </div>
      </div>

      {/* ---- mastery + activity ---- */}
      <div className="bento">
        <div className="c5">
          <div className="panel rail pad" style={{ height: '100%' }}>
            <SHead title="Mastery" />
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <Ring p={s.all.pct} label="Overall" color="var(--xp)" />
              <div style={{ flex: 1, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 13 }}>
                {[
                  ['HLD', s.hld, 'hld'],
                  ['LLD', s.lld, 'lld'],
                  ['Patterns', s.patterns, 'ok'],
                  ['Problems', s.problems, 'warn'],
                ].map(([label, st, cls]) => {
                  const stat = st as Stats['hld'];
                  return (
                    <div key={label as string}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11,
                          fontFamily: 'var(--mono)',
                          marginBottom: 5,
                        }}
                      >
                        <span className="muted" style={{ fontWeight: 700 }}>
                          {label as string}
                        </span>
                        <span className="num">
                          {stat.done}/{stat.total}
                        </span>
                      </div>
                      <Meter p={stat.pct} cls={cls as string} seg />
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="row wrap"
              style={{ marginTop: 16, gap: 14, borderTop: '1px solid var(--line)', paddingTop: 13 }}
            >
              <span className="count-note" style={{ color: 'var(--ok)' }}>✓ {s.all.done} done</span>
              <span className="count-note" style={{ color: 'var(--hld)' }}>▶ {s.all.prog} active</span>
              <span className="count-note" style={{ color: 'var(--warn)' }}>↻ {s.all.rev} to revise</span>
              <span className="count-note">○ {s.all.todo} locked</span>
            </div>
          </div>
        </div>

        <div className="c7">
          <div className="panel rail fire pad" style={{ height: '100%' }}>
            <SHead title="Activity" sub={`${streak}-day streak · best ${best}`} />
            <Heatmap state={state} weeks={20} />

            <div className="bento" style={{ marginTop: 16, marginBottom: 0, gap: 10 }}>
              <div className="c4">
                <div className="panel soft pad" style={{ background: 'var(--panel-2)' }}>
                  <span className="k" style={{ fontSize: 9.5, letterSpacing: 1.1, color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Current
                  </span>
                  <div className="stat-v" style={{ fontSize: 24, color: 'var(--fire)' }}>{streak}d</div>
                </div>
              </div>
              <div className="c4">
                <div className="panel soft pad" style={{ background: 'var(--panel-2)' }}>
                  <span className="k" style={{ fontSize: 9.5, letterSpacing: 1.1, color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Longest
                  </span>
                  <div className="stat-v" style={{ fontSize: 24 }}>{best}d</div>
                </div>
              </div>
              <div className="c4">
                <div className="panel soft pad" style={{ background: 'var(--panel-2)' }}>
                  <span className="k" style={{ fontSize: 9.5, letterSpacing: 1.1, color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total XP
                  </span>
                  <div className="stat-v" style={{ fontSize: 24, color: 'var(--xp)' }}>{lv.xp.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- quests + next targets ---- */}
      <div className="bento">
        <div className="c6">
          <div className="panel rail xp" style={{ height: '100%' }}>
            <div className="pad" style={{ paddingBottom: 4 }}>
              <SHead
                title="Today's quests"
                sub={quests.total ? `${quests.done}/${quests.total} · ${quests.xp} XP on the board` : 'nothing accepted'}
                right={
                  <button className="btn xs ghost" onClick={() => onGo('today')}>
                    Open →
                  </button>
                }
              />
            </div>
            {state.today.items.length ? (
              <div>
                {state.today.items.map((it) => {
                  const t = it.topicId ? state.topics.find((x) => x.id === it.topicId) : null;
                  return (
                    <div className="quest" key={it.id} data-done={it.done ? 1 : 0}>
                      <button
                        className="chk"
                        data-on={it.done ? 1 : 0}
                        aria-label={`toggle ${it.text}`}
                        onClick={() => store.toggleTodayDone(it.id)}
                      >
                        <svg width="12" height="12" aria-hidden="true">
                          <use href="#i-check" />
                        </svg>
                      </button>
                      <div>
                        <div className="q-t">{it.text}</div>
                        <div className="q-m">
                          {t ? `${t.type} · ${t.category} · ${t.difficulty}` : 'custom objective'}
                        </div>
                      </div>
                      <span className="q-xp">+{t ? xpFor(t) : 10}</span>
                    </div>
                  );
                })}
                {quests.complete ? (
                  <div className="q-bonus">
                    <span style={{ fontSize: 19 }} aria-hidden="true">🏆</span>
                    <b>All quests cleared</b>
                    <span className="spacer" />
                    <span className="q-xp">+{quests.bonus} bonus</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <Empty icon="🗺" title="No quests accepted" msg="Pick up to 5 topics to focus on today." />
            )}
          </div>
        </div>

        <div className="c6">
          <div className="panel rail ok" style={{ height: '100%' }}>
            <div className="pad" style={{ paddingBottom: 4 }}>
              <SHead title="Recommended next" sub="fundamentals first, then easiest" />
            </div>
            {next.length ? (
              <div className="tlist">
                {next.map((t) => (
                  <TopicRow key={t.id} topic={t} onEdit={onEdit} onOpen={onOpen} />
                ))}
              </div>
            ) : (
              <Empty icon="👑" title="Catalogue cleared" msg="Every topic is complete. Legendary." />
            )}
          </div>
        </div>
      </div>

      {/* ---- skill trees ---- */}
      <div className="bento">
        <div className="c6">
          <div className="panel rail hld pad" style={{ height: '100%' }}>
            <SHead title="HLD path" sub={`${s.hld.done}/${s.hld.total}`} />
            <SkillTree nodes={hldTree} onPick={pickCat} />
          </div>
        </div>
        <div className="c6">
          <div className="panel rail lld pad" style={{ height: '100%' }}>
            <SHead title="LLD path" sub={`${s.lld.done}/${s.lld.total}`} />
            <SkillTree nodes={lldTree} onPick={pickCat} />
          </div>
        </div>
      </div>

      {/* ---- achievements preview ---- */}
      <div className="panel rail pad section">
        <SHead
          title="Awards"
          sub={`${unlocked.length}/${ach.length} unlocked`}
          right={
            <button className="btn xs ghost" onClick={() => onGo('awards')}>
              View all →
            </button>
          }
        />
        <div className="ach-grid">
          {[...unlocked.slice(-4).reverse(), ...nearly].slice(0, 8).map((a) => (
            <AchCard key={a.id} a={a} />
          ))}
        </div>
      </div>

      {/* ---- category breakdown ---- */}
      <div className="panel rail pad section">
        <SHead title="All tracks" sub={`${s.byCat.length} categories`} />
        {s.byCat.map((c) => (
          <div
            key={`${c.type}|${c.cat}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(140px,1.4fr) minmax(80px,2fr) 66px',
              gap: 13,
              alignItems: 'center',
              padding: '9px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 12.5, fontWeight: 650 }}>
              <TypeTag type={c.type} />
              <em style={{ fontStyle: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.cat}
              </em>
            </span>
            <Meter p={c.pct} cls={c.type === 'LLD' ? 'lld' : 'hld'} seg />
            <span className="num" style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--tx-2)', textAlign: 'right' }}>
              {c.done}/{c.total}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
