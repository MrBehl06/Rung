import type { Tier } from '../lib/game';
import type { TrackerState } from '../types';
import { RANKS, TIER_COLOR, achievements, levelInfo, xpToReach } from '../lib/game';
import { AchCard, Meter, SHead, Tile } from '../components/hud';

const TIER_ORDER: Tier[] = ['legendary', 'gold', 'silver', 'bronze'];

export function Awards({ state }: { state: TrackerState }) {
  const ach = achievements(state);
  const lv = levelInfo(state);
  const unlocked = ach.filter((a) => a.unlocked);

  const byTier = TIER_ORDER.map((tier) => ({
    tier,
    items: ach.filter((a) => a.tier === tier),
  })).filter((g) => g.items.length);

  return (
    <section className="view">
      <div className="bento">
        <div className="c3">
          <Tile k="Unlocked" v={`${unlocked.length}/${ach.length}`} m="awards earned" cls="xp" p={(unlocked.length / ach.length) * 100} icon="🏆" />
        </div>
        <div className="c3">
          <Tile k="Level" v={lv.level} m={lv.rank} cls="xp" icon="◈" />
        </div>
        <div className="c3">
          <Tile k="Total XP" v={lv.xp.toLocaleString()} m={`${lv.toNext} to next level`} cls="ok" icon="⚡" />
        </div>
        <div className="c3">
          <Tile
            k="Legendary"
            v={`${unlocked.filter((a) => a.tier === 'legendary').length}/${ach.filter((a) => a.tier === 'legendary').length}`}
            m="hardest tier"
            cls="warn"
            icon="👑"
          />
        </div>
      </div>

      {/* rank ladder */}
      <div className="panel rail pad section">
        <SHead title="Rank ladder" sub={`currently ${lv.rank}`} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {RANKS.map((r, i) => {
            const nextMin = RANKS[i + 1]?.min ?? r.min + 2;
            const reached = lv.level >= r.min;
            const current = lv.level >= r.min && lv.level < nextMin;
            return (
              <div
                key={r.title}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '54px 1fr auto',
                  gap: 13,
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: current ? 'color-mix(in srgb,var(--xp) 11%,transparent)' : 'transparent',
                  borderLeft: current ? '2px solid var(--xp)' : '2px solid transparent',
                  opacity: reached ? 1 : 0.45,
                }}
              >
                <span
                  className="num"
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: 800,
                    color: reached ? 'var(--xp)' : 'var(--tx-3)',
                  }}
                >
                  LV {r.min}+
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {r.title}
                  {current ? <span className="badge s-completed" style={{ marginLeft: 8 }}>you</span> : null}
                </span>
                <span className="num" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--tx-3)' }}>
                  {xpToReach(r.min).toLocaleString()} XP
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {byTier.map((g) => {
        const got = g.items.filter((a) => a.unlocked).length;
        return (
          <div className="panel rail pad section" key={g.tier} style={{ ['--rail' as string]: TIER_COLOR[g.tier] }}>
            <SHead title={g.tier} sub={`${got}/${g.items.length}`} />
            <div style={{ marginBottom: 13 }}>
              <Meter p={(got / g.items.length) * 100} />
            </div>
            <div className="ach-grid">
              {g.items.map((a) => (
                <AchCard key={a.id} a={a} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
