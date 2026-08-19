import type { Difficulty, Status, Topic, TopicType, TrackerState } from '../types';
import { DIFFS, STATUSES, TYPES } from '../types';
import { CATS, seedRows } from '../data/seed';
import { KEY, SCHEMA, Storage } from './storage';
import { nowISO, todayISO, uid } from './utils';

export function blankState(): TrackerState {
  return {
    schema: SCHEMA,
    topics: [],
    today: { date: todayISO(), items: [] },
    history: {},
    removedSeeds: [],
    seenAchievements: [],
    ui: {
      theme: 'dark',
      view: 'dashboard',
      collapsed: {},
      filters: { q: '', type: 'all', category: 'all', status: 'all', difficulty: 'all' },
    },
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
}

/** Coerce anything (old saves, imported files, command input) into a valid Topic. */
export function makeTopic(o: Partial<Topic> & { name?: string }): Topic {
  const type: TopicType = TYPES.includes(o.type as TopicType) ? (o.type as TopicType) : 'HLD';
  const status: Status = STATUSES.includes(o.status as Status) ? (o.status as Status) : 'Not Started';
  const difficulty: Difficulty = DIFFS.includes(o.difficulty as Difficulty)
    ? (o.difficulty as Difficulty)
    : 'Medium';

  return {
    id: o.id || uid(),
    sid: o.sid ?? null,
    name: String(o.name ?? '').trim(),
    type,
    category: o.category || CATS[type][0],
    status,
    difficulty,
    notes: o.notes || '',
    dateStarted: o.dateStarted ?? (status !== 'Not Started' ? todayISO() : null),
    dateCompleted:
      o.dateCompleted ?? (status === 'Completed' || status === 'Needs Revision' ? todayISO() : null),
    lastRevisedAt: o.lastRevisedAt ?? null,
    revisionCount: Number.isFinite(o.revisionCount) ? (o.revisionCount as number) : 0,
    // plain assignment, not ??, so a legitimate step of 0 survives a round-trip
    srStep: Number.isFinite(o.srStep) ? (o.srStep as number) : undefined,
    srDue: o.srDue ?? null,
    order: Number.isFinite(o.order) ? (o.order as number) : 999,
    createdAt: o.createdAt || nowISO(),
    updatedAt: o.updatedAt || nowISO(),
  };
}

export interface LoadResult {
  state: TrackerState;
  /** how many catalogue rows were newly merged in */
  added: number;
}

/**
 * Read from storage, migrate, then merge in any catalogue rows that are neither
 * already present nor explicitly deleted by the user. Progress is never
 * overwritten — the merge only ever appends.
 */
export function loadState(raw?: string | null): LoadResult {
  const blank = blankState();
  let saved: Partial<TrackerState> | null = null;

  try {
    const text = raw !== undefined ? raw : Storage.get(KEY);
    if (text) saved = JSON.parse(text) as Partial<TrackerState>;
  } catch (e) {
    console.warn('[tracker] corrupt save, starting fresh', e);
  }

  let state: TrackerState;
  if (saved && Array.isArray(saved.topics)) {
    state = { ...blank, ...saved } as TrackerState;
    state.ui = { ...blank.ui, ...(saved.ui ?? {}) };
    state.ui.filters = { ...blank.ui.filters, ...(saved.ui?.filters ?? {}) };
    state.today =
      saved.today && Array.isArray(saved.today.items) ? saved.today : blank.today;
    state.history = saved.history ?? {};
    state.removedSeeds = saved.removedSeeds ?? [];
    state.seenAchievements = saved.seenAchievements ?? [];
    state.topics = saved.topics.map(makeTopic);
  } else {
    state = blank;
  }

  const bySid = new Set(state.topics.map((t) => t.sid).filter(Boolean));
  const removed = new Set(state.removedSeeds);
  let added = 0;
  for (const row of seedRows()) {
    if (bySid.has(row.sid) || removed.has(row.sid)) continue;
    state.topics.push(makeTopic(row));
    added++;
  }

  return { state, added };
}
