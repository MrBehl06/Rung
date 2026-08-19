import type {
  CategoryStat,
  DifficultyStat,
  Stat,
  Stats,
  Topic,
  TrackerState,
} from '../types';
import { DIFFS, TYPES } from '../types';
import { CATS } from '../data/seed';
import { pct, todayISO } from './utils';

/** Every number on the dashboard comes from here — nothing is ever stored. */
export function statsFor(list: Topic[]): Stat {
  const s = { total: list.length, done: 0, prog: 0, rev: 0, todo: 0, pct: 0 };
  for (const t of list) {
    if (t.status === 'Completed') s.done++;
    else if (t.status === 'In Progress') s.prog++;
    else if (t.status === 'Needs Revision') s.rev++;
    else s.todo++;
  }
  s.pct = pct(s.done, s.total);
  return s;
}

export function computeStats(state: TrackerState): Stats {
  const all = state.topics;
  const hld = all.filter((t) => t.type === 'HLD');
  const lld = all.filter((t) => t.type === 'LLD');
  const patterns = lld.filter((t) => /Patterns$/.test(t.category));
  const problems = all.filter((t) => /Problems$/.test(t.category));

  const byCat: CategoryStat[] = [];
  for (const type of TYPES) {
    for (const cat of CATS[type]) {
      const list = all.filter((t) => t.type === type && t.category === cat);
      if (list.length) byCat.push({ type, cat, ...statsFor(list) });
    }
  }
  // categories the user invented that aren't in the catalogue
  for (const t of all) {
    if (
      !CATS[t.type].includes(t.category) &&
      !byCat.some((c) => c.type === t.type && c.cat === t.category)
    ) {
      const list = all.filter((x) => x.type === t.type && x.category === t.category);
      byCat.push({ type: t.type, cat: t.category, custom: true, ...statsFor(list) });
    }
  }

  const byDiff: DifficultyStat[] = DIFFS.map((d) => ({
    d,
    ...statsFor(all.filter((t) => t.difficulty === d)),
  }));

  return {
    all: statsFor(all),
    hld: statsFor(hld),
    lld: statsFor(lld),
    patterns: statsFor(patterns),
    problems: statsFor(problems),
    hldProblems: statsFor(hld.filter((t) => t.category === 'HLD Problems')),
    lldProblems: statsFor(lld.filter((t) => t.category === 'LLD Problems')),
    needsRevision: all.filter((t) => t.status === 'Needs Revision'),
    inProgress: all
      .filter((t) => t.status === 'In Progress')
      .sort((a, b) => String(b.dateStarted ?? '').localeCompare(String(a.dateStarted ?? ''))),
    recent: all
      .filter((t) => t.status === 'Completed')
      .sort(
        (a, b) =>
          String(b.dateCompleted ?? '').localeCompare(String(a.dateCompleted ?? '')) ||
          String(b.updatedAt).localeCompare(String(a.updatedAt)),
      )
      .slice(0, 8),
    byCat,
    byDiff,
  };
}

/** consecutive days (ending today or yesterday) with at least one completion */
export function completionStreak(state: TrackerState): number {
  const days = Object.keys(state.history).filter((k) => state.history[k] > 0);
  if (!days.length) return 0;
  const set = new Set(days);
  let streak = 0;
  let cur = new Date();
  if (!set.has(todayISO(cur))) cur = new Date(Date.now() - 864e5);
  for (;;) {
    if (!set.has(todayISO(cur))) break;
    streak++;
    cur = new Date(cur.getTime() - 864e5);
  }
  return streak;
}

const CAT_RANK: Record<string, number> = {
  'Fundamentals': 0,
  'Principles': 0,
  'Core Components': 8,
  'Creational Patterns': 8,
  'Structural Patterns': 12,
  'Database & Storage': 14,
  'Behavioral Patterns': 18,
  'Distributed Systems': 24,
  'HLD Problems': 32,
  'LLD Problems': 32,
};

/** "What should I study next?" — resume work in flight, then fundamentals, then easy wins. */
export function suggestNext(state: TrackerState, n = 5): Topic[] {
  const weight = (t: Topic): number => {
    let w = 0;
    if (t.status === 'In Progress') w -= 120;
    if (t.status === 'Needs Revision') w -= 90;
    if (t.status === 'Completed') w += 1000;
    w += CAT_RANK[t.category] ?? 26;
    w += { Easy: 0, Medium: 4, Hard: 9 }[t.difficulty] ?? 4;
    w += (t.order || 0) * 0.05;
    return w;
  };
  return state.topics
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => weight(a) - weight(b))
    .slice(0, n);
}
