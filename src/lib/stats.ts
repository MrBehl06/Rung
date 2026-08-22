import type {
  CategoryStat,
  DifficultyStat,
  Stat,
  Stats,
  Topic,
  TrackerState,
} from '../types';
import { DIFFS } from '../types';
import { SPRINTS, categoriesOf, categoryRank } from '../data/sprints';
import { activeTopics } from './scope';
import { pct } from './utils';

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

export function statsForSprint(state: TrackerState, sprintId: string): Stat {
  return statsFor(state.topics.filter((t) => t.sprint === sprintId));
}

export function computeStats(state: TrackerState): Stats {
  const all = state.topics;
  const bySprint: Record<string, Stat> = {};
  for (const s of SPRINTS) bySprint[s.id] = statsFor(all.filter((t) => t.sprint === s.id));

  const hld = all.filter((t) => t.sprint === 'hld');
  const lld = all.filter((t) => t.sprint === 'lld');
  const patterns = lld.filter((t) => /Patterns$/.test(t.category));
  const problems = all.filter((t) => /Problems$/.test(t.category));

  const byCat: CategoryStat[] = [];
  for (const s of SPRINTS) {
    for (const cat of categoriesOf(s.id)) {
      const list = all.filter((t) => t.sprint === s.id && t.category === cat);
      if (list.length) byCat.push({ type: s.short, cat, ...statsFor(list) });
    }
  }
  // categories the user invented that aren't in the catalogue
  for (const t of all) {
    if (
      !categoriesOf(t.sprint).includes(t.category) &&
      !byCat.some((c) => c.cat === t.category)
    ) {
      const list = all.filter((x) => x.sprint === t.sprint && x.category === t.category);
      byCat.push({ type: t.sprint, cat: t.category, custom: true, ...statsFor(list) });
    }
  }

  const byDiff: DifficultyStat[] = DIFFS.map((d) => ({
    d,
    ...statsFor(all.filter((t) => t.difficulty === d)),
  }));

  return {
    all: statsFor(all),
    bySprint,
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

/** "What should I study next?" — resume work in flight, then fundamentals, then easy wins. */
export function suggestNext(state: TrackerState, n = 5): Topic[] {
  const weight = (t: Topic): number => {
    let w = 0;
    if (t.status === 'In Progress') w -= 120;
    if (t.status === 'Needs Revision') w -= 90;
    if (t.status === 'Completed') w += 1000;
    w += categoryRank(t.sprint, t.category);
    w += { Easy: 0, Medium: 4, Hard: 9 }[t.difficulty] ?? 4;
    w += (t.order || 0) * 0.05;
    return w;
  };
  return activeTopics(state)
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => weight(a) - weight(b))
    .slice(0, n);
}
