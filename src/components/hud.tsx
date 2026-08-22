import type { ReactNode } from 'react';
import type { TreeNode } from '../lib/game';

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

/* ---------- skill tree ---------- */
export function SkillTree({
  nodes,
  onPick,
}: {
  nodes: TreeNode[];
  onPick: (cat: string, sprint: string) => void;
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
            ['--rail' as string]: 'var(--sprint, var(--hld))',
          }}
          onClick={() => onPick(n.cat, n.sprint)}
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
            <Meter p={n.pct} cls="sprint" seg />
          </span>
          <span className="node-pct">{n.pct}%</span>
        </button>
      ))}
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
