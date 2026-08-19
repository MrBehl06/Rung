import type { Difficulty, Topic, TrackerState } from '../types';
import { computeStats, completionStreak } from './stats';
import { todayISO } from './utils';

/* ============================================================
   XP + levels
   Everything here is DERIVED from data the tracker already
   stores, so existing saves get a level and badges for free.
   ============================================================ */

export const XP_BY_DIFF: Record<Difficulty, number> = { Easy: 10, Medium: 25, Hard: 50 };
/** each logged revision is worth this — the revision loop should pay */
export const XP_PER_REVISION = 15;
/** finishing every quest on the board */
export const QUEST_BONUS = 40;

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
   streaks + activity heatmap
   ============================================================ */

export function longestStreak(state: TrackerState): number {
  const days = Object.keys(state.history)
    .filter((k) => state.history[k] > 0)
    .sort();
  if (!days.length) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T00:00:00').getTime();
    const cur = new Date(days[i] + 'T00:00:00').getTime();
    run = Math.round((cur - prev) / 864e5) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export interface HeatCell {
  date: string;
  count: number;
  /** 0-4 intensity bucket */
  level: number;
}

/** last `weeks` weeks of activity, oldest first, aligned to whole weeks */
export function heatmap(state: TrackerState, weeks = 20): HeatCell[] {
  const cells: HeatCell[] = [];
  const today = new Date();
  // walk back to the most recent Sunday so columns line up as weeks
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));
  const days = weeks * 7;
  const counts = state.history;
  let max = 1;
  for (const k of Object.keys(counts)) max = Math.max(max, counts[k]);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = todayISO(d);
    const count = counts[key] ?? 0;
    let level = 0;
    if (count > 0) level = Math.min(4, Math.ceil((count / max) * 4));
    cells.push({ date: key, count, level });
  }
  return cells;
}

/* ============================================================
   achievements — all predicates run against live state
   ============================================================ */

export type Tier = 'bronze' | 'silver' | 'gold' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: Tier;
  cur: number;
  target: number;
  unlocked: boolean;
}

const PATTERN_CATS = ['Creational Patterns', 'Structural Patterns', 'Behavioral Patterns'];

export function achievements(state: TrackerState): Achievement[] {
  const s = computeStats(state);
  const done = state.topics.filter((t) => t.status === 'Completed');
  const doneIn = (cat: string) =>
    state.topics.filter((t) => t.category === cat && t.status === 'Completed').length;
  const totalIn = (cat: string) => state.topics.filter((t) => t.category === cat).length;
  const hardDone = done.filter((t) => t.difficulty === 'Hard').length;
  const revisions = state.topics.reduce((n, t) => n + (t.revisionCount || 0), 0);
  const streak = completionStreak(state);
  const best = Math.max(streak, longestStreak(state));
  const patternsDone = state.topics.filter(
    (t) => PATTERN_CATS.includes(t.category) && t.status === 'Completed',
  ).length;
  const patternsTotal = state.topics.filter((t) => PATTERN_CATS.includes(t.category)).length;

  const raw: Omit<Achievement, 'unlocked'>[] = [
    { id: 'first-blood', name: 'First Blood', desc: 'Complete your first topic', icon: '🎯', tier: 'bronze', cur: done.length, target: 1 },
    { id: 'getting-going', name: 'Getting Going', desc: 'Complete 10 topics', icon: '🌱', tier: 'bronze', cur: done.length, target: 10 },
    { id: 'solid-ground', name: 'Solid Ground', desc: 'Finish the Principles track', icon: '🧱', tier: 'bronze', cur: doneIn('Principles'), target: Math.max(1, totalIn('Principles')) },
    { id: 'fundamentalist', name: 'Fundamentalist', desc: 'Finish every Fundamentals topic', icon: '📐', tier: 'silver', cur: doneIn('Fundamentals'), target: Math.max(1, totalIn('Fundamentals')) },
    { id: 'component-smith', name: 'Component Smith', desc: 'Finish every Core Component', icon: '⚙️', tier: 'silver', cur: doneIn('Core Components'), target: Math.max(1, totalIn('Core Components')) },
    { id: 'data-wrangler', name: 'Data Wrangler', desc: 'Finish Database & Storage', icon: '🗄️', tier: 'silver', cur: doneIn('Database & Storage'), target: Math.max(1, totalIn('Database & Storage')) },
    { id: 'distributed', name: 'Distributed', desc: 'Finish Distributed Systems', icon: '🌐', tier: 'gold', cur: doneIn('Distributed Systems'), target: Math.max(1, totalIn('Distributed Systems')) },
    { id: 'pattern-hunter', name: 'Pattern Hunter', desc: 'Complete all design patterns', icon: '🧩', tier: 'gold', cur: patternsDone, target: Math.max(1, patternsTotal) },
    { id: 'deep-diver', name: 'Deep Diver', desc: 'Complete 10 Hard topics', icon: '🌊', tier: 'silver', cur: hardDone, target: 10 },
    { id: 'boss-slayer', name: 'Boss Slayer', desc: 'Complete 25 Hard topics', icon: '⚔️', tier: 'gold', cur: hardDone, target: 25 },
    { id: 'problem-solver', name: 'Problem Solver', desc: 'Complete 20 design problems', icon: '🧠', tier: 'silver', cur: s.problems.done, target: 20 },
    { id: 'halfway', name: 'Halfway There', desc: 'Reach 50% overall completion', icon: '🏔️', tier: 'silver', cur: s.all.pct, target: 50 },
    { id: 'hld-master', name: 'HLD Master', desc: 'Complete every HLD topic', icon: '🏗️', tier: 'legendary', cur: s.hld.done, target: Math.max(1, s.hld.total) },
    { id: 'lld-master', name: 'LLD Master', desc: 'Complete every LLD topic', icon: '🔬', tier: 'legendary', cur: s.lld.done, target: Math.max(1, s.lld.total) },
    { id: 'completionist', name: 'Completionist', desc: 'Complete the entire catalogue', icon: '👑', tier: 'legendary', cur: s.all.done, target: Math.max(1, s.all.total) },
    { id: 'consistent', name: 'Consistent', desc: 'Hold a 7-day streak', icon: '🔥', tier: 'bronze', cur: best, target: 7 },
    { id: 'relentless', name: 'Relentless', desc: 'Hold a 14-day streak', icon: '⚡', tier: 'silver', cur: best, target: 14 },
    { id: 'unstoppable', name: 'Unstoppable', desc: 'Hold a 30-day streak', icon: '💫', tier: 'legendary', cur: best, target: 30 },
    { id: 'scholar', name: 'Scholar', desc: 'Log 25 revisions', icon: '📚', tier: 'gold', cur: revisions, target: 25 },
  ];

  return raw.map((a) => ({ ...a, cur: Math.min(a.cur, a.target), unlocked: a.cur >= a.target }));
}

export const TIER_COLOR: Record<Tier, string> = {
  bronze: 'var(--tier-bronze)',
  silver: 'var(--tier-silver)',
  gold: 'var(--tier-gold)',
  legendary: 'var(--tier-legendary)',
};

/* ============================================================
   skill tree — categories as an unlockable path
   ============================================================ */

export interface TreeNode {
  cat: string;
  type: string;
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

export function skillTree(state: TrackerState, type: string, order: string[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  let prevPct = 100; // first node is always open
  order.forEach((cat, index) => {
    const list = state.topics.filter((t) => t.type === type && t.category === cat);
    const done = list.filter((t) => t.status === 'Completed').length;
    const total = list.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    nodes.push({
      cat,
      type,
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

/* ============================================================
   daily quests
   ============================================================ */

export interface QuestState {
  total: number;
  done: number;
  /** XP on the board today */
  xp: number;
  complete: boolean;
  bonus: number;
}

export function questState(state: TrackerState): QuestState {
  const items = state.today.items;
  const done = items.filter((i) => i.done).length;
  let xp = 0;
  for (const i of items) {
    const t = i.topicId ? state.topics.find((x) => x.id === i.topicId) : null;
    xp += t ? xpFor(t) : 10;
  }
  return {
    total: items.length,
    done,
    xp,
    complete: items.length > 0 && done === items.length,
    bonus: QUEST_BONUS,
  };
}
