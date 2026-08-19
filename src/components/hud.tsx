import type { ReactNode } from 'react';
import type { Stats, TopicType, TrackerState } from '../types';
import type { Achievement, HeatCell, LevelInfo, TreeNode } from '../lib/game';
import { TIER_COLOR, heatmap } from '../lib/game';
import { todayISO } from '../lib/utils';

/* ---------- section header ---------- */
export function SHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="shead">
      <h2>{title}</h2>
      <span className="line" />
      {sub ? <span className="sub">{sub}</span> : null}
      {right}
    </div>
  );
}

/* ---------- meter ---------- */
export function Meter({ p, cls = '', seg }: { p: number; cls?: string; seg?: boolean }) {
  return (
    <span className={`meter ${cls} ${seg ? 'seg' : ''}`}>
      <i style={{ width: `${Math.max(0, Math.min(100, p))}%` }} />
    </span>
  );
}

/* ---------- stat tile ---------- */
export function Tile({
  k,
  v,
  m,
  cls = '',
  p,
  icon,
}: {
  k: string;
  v: ReactNode;
  m?: string;
  cls?: string;
  p?: number;
  icon?: string;
}) {
  return (
    <div className={`panel rail ${cls} tile`}>
      <span className="k">
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        {k}
      </span>
      <span className="stat-v">{v}</span>
      {p != null ? <Meter p={p} cls={cls} /> : null}
      {m ? <span className="m">{m}</span> : null}
    </div>
  );
}

/* ---------- the hero HUD ---------- */
export function HeroHud({
  lv,
  stats,
  streak,
  best,
  questDone,
  questTotal,
  unlockedCount,
  totalAch,
}: {
  lv: LevelInfo;
  stats: Stats;
  streak: number;
  best: number;
  questDone: number;
  questTotal: number;
  unlockedCount: number;
  totalAch: number;
}) {
  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-badge" aria-hidden="true">
          <div style={{ textAlign: 'center' }}>
            <span>lvl</span>
            <b>{lv.level}</b>
          </div>
        </div>

        <div className="hud-lv">
          <div className="hud-rank">{lv.rank}</div>
          <div className="hud-sub">
            {lv.xp.toLocaleString()} XP total · {lv.toNext.toLocaleString()} to level {lv.level + 1}
          </div>
          <div className="xpbar">
            <i style={{ width: `${lv.pct}%` }} />
            <em>
              {lv.into} / {lv.span} XP
            </em>
          </div>
        </div>

        <div className="hud-vitals">
          <div className="vital fire">
            <span className="k">Streak</span>
            <span className="v">{streak}</span>
            <span className="m">best {best}d</span>
          </div>
          <div className="vital ok">
            <span className="k">Mastery</span>
            <span className="v">{stats.all.pct}%</span>
            <span className="m">
              {stats.all.done}/{stats.all.total}
            </span>
          </div>
          <div className="vital xp">
            <span className="k">Quests</span>
            <span className="v">
              {questDone}/{questTotal}
            </span>
            <span className="m">today</span>
          </div>
          <div className="vital">
            <span className="k">Awards</span>
            <span className="v">{unlockedCount}</span>
            <span className="m">of {totalAch}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- activity heatmap ---------- */
export function Heatmap({ state, weeks = 20 }: { state: TrackerState; weeks?: number }) {
  const cells: HeatCell[] = heatmap(state, weeks);
  const today = todayISO();
  const cols: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  const active = cells.filter((c) => c.count > 0).length;

  return (
    <div>
      <div className="heat">
        {cols.map((col, i) => (
          <div className="heat-col" key={i}>
            {col.map((c) => (
              <span
                key={c.date}
                className="heat-c"
                data-l={c.level}
                data-today={c.date === today ? 1 : 0}
                title={`${c.date} — ${c.count} completed`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heat-legend">
        <span>{active} active days</span>
        <span className="spacer" style={{ flex: 1 }} />
        <span>less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="heat-c" data-l={l} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}

/* ---------- skill tree ---------- */
export function SkillTree({
  nodes,
  onPick,
}: {
  nodes: TreeNode[];
  onPick: (cat: string, type: TopicType) => void;
}) {
  return (
    <div className="tree">
      {nodes.map((n) => (
        <button
          key={n.cat}
          className={`node ${n.mastered ? 'done' : ''} ${n.unlocked ? 'open' : 'locked'}`}
          style={{
            background: 'none',
            border: 0,
            textAlign: 'left',
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer',
            width: '100%',
            ['--rail' as string]: n.type === 'LLD' ? 'var(--lld)' : 'var(--hld)',
          }}
          onClick={() => onPick(n.cat, n.type)}
          title={n.unlocked ? `Filter to ${n.cat}` : `Clear more of the previous track to unlock`}
        >
          <span className="node-dot">{n.mastered ? '✓' : n.unlocked ? n.index + 1 : '🔒'}</span>
          <span>
            <span className="node-name">
              {n.cat}
              {n.mastered ? <span className="badge s-completed">mastered</span> : null}
            </span>
            <span className="node-meta">
              {n.done}/{n.total} cleared
            </span>
            <Meter p={n.pct} cls={n.type === 'LLD' ? 'lld' : 'hld'} seg />
          </span>
          <span className="node-pct">{n.pct}%</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- achievement card ---------- */
export function AchCard({ a }: { a: Achievement }) {
  return (
    <div
      className={`ach ${a.unlocked ? 'got' : 'locked'}`}
      style={{ ['--tc' as string]: TIER_COLOR[a.tier] }}
    >
      <span className="ach-tier">{a.tier}</span>
      <span className="ach-ico" aria-hidden="true">
        {a.unlocked ? a.icon : '🔒'}
      </span>
      <div className="ach-n">{a.name}</div>
      <div className="ach-d">{a.desc}</div>
      {!a.unlocked ? (
        <div className="ach-prog">
          <Meter p={(a.cur / a.target) * 100} />
          <span className="pn">
            {a.cur} / {a.target}
          </span>
        </div>
      ) : (
        <div className="ach-prog">
          <span className="pn" style={{ color: TIER_COLOR[a.tier] }}>
            ✓ unlocked
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- unlock celebration ---------- */
export function UnlockToast({ a }: { a: Achievement }) {
  return (
    <div className="unlock" style={{ ['--tc' as string]: TIER_COLOR[a.tier] }} role="status">
      <span className="u-ico" aria-hidden="true">
        {a.icon}
      </span>
      <span className="u-txt">
        <span className="u-lb">{a.tier} unlocked</span>
        <span className="u-n">{a.name}</span>
        <span className="u-d">{a.desc}</span>
      </span>
    </div>
  );
}

/* ---------- empty state ---------- */
export function Empty({ icon, title, msg }: { icon: string; title: string; msg: string }) {
  return (
    <div className="empty">
      <span className="e-ico" aria-hidden="true">
        {icon}
      </span>
      <b>{title}</b>
      <p>{msg}</p>
    </div>
  );
}

/* ---------- ring ---------- */
export function Ring({ p, label, color }: { p: number; label: string; color: string }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  return (
    <div className="ring">
      <svg viewBox="0 0 150 150" aria-hidden="true">
        <circle cx="75" cy="75" r={R} fill="none" stroke="var(--track)" strokeWidth="12" />
        <circle
          cx="75"
          cy="75"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p / 100)}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <span className="t">
        <b>{p}%</b>
        <span>{label}</span>
      </span>
    </div>
  );
}
