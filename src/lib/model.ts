import type { Difficulty, Status, Topic, TrackerState } from '../types';
import { DIFFS, STATUSES } from '../types';
import { SPRINTS, getSprint, resolveSprint, seedRows } from '../data/sprints';
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
    joinedSprints: [],
    ui: {
      theme: 'dark',
      view: 'dashboard',
      activeSprint: null,
      collapsed: {},
      filters: { q: '', sprint: 'all', category: 'all', status: 'all', difficulty: 'all' },
    },
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
}

/** Coerce anything (old saves, imported files, command input) into a valid Topic. */
export function makeTopic(o: Partial<Topic> & { name?: string; type?: string }): Topic {
  // `type` is the pre-sprint field name. Old saves and exported backups still
  // carry it, so it is read here forever — but never written back.
  const sprint = resolveSprint(o.sprint ?? o.type);
  const def = getSprint(sprint) ?? SPRINTS[0];
  const status: Status = STATUSES.includes(o.status as Status) ? (o.status as Status) : 'Not Started';
  const difficulty: Difficulty = DIFFS.includes(o.difficulty as Difficulty)
    ? (o.difficulty as Difficulty)
    : 'Medium';

  return {
    id: o.id || uid(),
    sid: o.sid ?? null,
    name: String(o.name ?? '').trim(),
    sprint,
    category: o.category || def.categories[0].name,
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

    // --- joinedSprints: absent means a pre-sprint save, which had everything on ---
    const savedJoined = (saved as { joinedSprints?: unknown }).joinedSprints;
    state.joinedSprints = Array.isArray(savedJoined)
      ? savedJoined.map(String).filter((id) => getSprint(id))
      : state.topics.length
        ? SPRINTS.map((s) => s.id)
        : [];

    // --- ui.view: 'hld' / 'lld' became the single 'sprint' view ---
    const legacyView = String(state.ui.view);
    if (legacyView === 'hld' || legacyView === 'lld') {
      state.ui.activeSprint = legacyView;
      state.ui.view = 'sprint';
    }

    // --- ui.filters.type: 'HLD' -> 'hld' ---
    // Test the SAVED object, not the merged one: blank.ui.filters already
    // supplies `sprint: 'all'`, so the merged value is never absent.
    const savedFilters = (saved.ui?.filters ?? {}) as { sprint?: string; type?: string };
    if (savedFilters.sprint == null) {
      const legacyFilter = savedFilters.type;
      state.ui.filters.sprint =
        legacyFilter && legacyFilter !== 'all' ? resolveSprint(legacyFilter) : 'all';
    }
  } else {
    state = blank;
    // a genuinely fresh user picks a sprint before anything else
    state.ui.view = 'sprints';
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
