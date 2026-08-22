import type { Difficulty, Topic, TrackerState } from '../types';
import { categoriesOf } from '../data/sprints';

/* ============================================================
   XP + levels
   Everything here is DERIVED from data the tracker already
   stores, so existing saves get a level and badges for free.
   ============================================================ */

export const XP_BY_DIFF: Record<Difficulty, number> = { Easy: 10, Medium: 25, Hard: 50 };
/** each logged revision is worth this — the revision loop should pay */
export const XP_PER_REVISION = 15;

export function xpFor(t: Topic): number {
  return XP_BY_DIFF[t.difficulty] ?? 25;
}

export function totalXp(state: TrackerState): number {
  let xp = 0;
  for (const t of state.topics) {
    if (t.status === 'Completed') xp += xpFor(t);
    xp += (t.revisionCount || 0) * XP_PER_REVISION;
  }
  return xp;
}

/** cumulative XP required to *reach* a level (level 1 costs nothing) */
export function xpToReach(level: number): number {
  return 20 * (level - 1) * level;
}

export const RANKS: { min: number; title: string }[] = [
  { min: 1, title: 'Initiate' },
  { min: 3, title: 'Novice' },
  { min: 5, title: 'Practitioner' },
  { min: 7, title: 'Journeyman' },
  { min: 9, title: 'Senior' },
  { min: 11, title: 'Architect' },
  { min: 13, title: 'Distinguished' },
];

export function rankFor(level: number): string {
  let title = RANKS[0].title;
  for (const r of RANKS) if (level >= r.min) title = r.title;
  return title;
}

export interface LevelInfo {
  level: number;
  rank: string;
  xp: number;
  /** xp earned inside the current level */
  into: number;
  /** xp span of the current level */
  span: number;
  /** 0-100 progress through the current level */
  pct: number;
  toNext: number;
}

export function levelInfo(state: TrackerState): LevelInfo {
  const xp = totalXp(state);
  let level = 1;
  while (xpToReach(level + 1) <= xp && level < 99) level++;
  const base = xpToReach(level);
  const next = xpToReach(level + 1);
  const span = next - base;
  const into = xp - base;
  return {
    level,
    rank: rankFor(level),
    xp,
    into,
    span,
    pct: span > 0 ? Math.round((into / span) * 100) : 100,
    toNext: Math.max(0, next - xp),
  };
}

/* ============================================================
   skill tree — a sprint's categories as an unlockable path
   ============================================================ */

export interface TreeNode {
  cat: string;
  sprint: string;
  done: number;
  total: number;
  pct: number;
  /** previous node cleared enough to open this one */
  unlocked: boolean;
  /** fully cleared */
  mastered: boolean;
  index: number;
}

const UNLOCK_AT = 40; // % of the previous node required

export function skillTree(state: TrackerState, sprintId: string): TreeNode[] {
  const nodes: TreeNode[] = [];
  let prevPct = 100; // first node is always open
  categoriesOf(sprintId).forEach((cat, index) => {
    const list = state.topics.filter((t) => t.sprint === sprintId && t.category === cat);
    const done = list.filter((t) => t.status === 'Completed').length;
    const total = list.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    nodes.push({
      cat,
      sprint: sprintId,
      done,
      total,
      pct,
      unlocked: prevPct >= UNLOCK_AT,
      mastered: total > 0 && done === total,
      index,
    });
    prevPct = pct;
  });
  return nodes;
}
