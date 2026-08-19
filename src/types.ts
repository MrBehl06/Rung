export const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Needs Revision'] as const;
export const DIFFS = ['Easy', 'Medium', 'Hard'] as const;

export type Status = (typeof STATUSES)[number];
export type Difficulty = (typeof DIFFS)[number];

/** @deprecated transitional — removed in Task 10. Use the sprint id string. */
export type TopicType = string;
/** @deprecated transitional shim so unmigrated consumers compile — removed in Task 10. */
export const TYPES: readonly string[] = ['HLD', 'LLD'];

export type ViewId =
  | 'dashboard'
  | 'sprints'
  | 'sprint'
  | 'today'
  | 'revision'
  | 'calendar'
  | 'awards'
  | 'guide'
  /** @deprecated transitional — migrated to 'sprint' in Task 8 */
  | 'hld'
  | 'lld';

/** digit-shortcut order; the 'sprint' view is reached by click, not by number */
export const VIEWS: ViewId[] = [
  'dashboard', 'sprints', 'today', 'revision', 'calendar', 'awards', 'guide',
];

export interface Topic {
  id: string;
  /** stable seed id — present only on catalogue rows, null on user-created topics */
  sid: string | null;
  name: string;
  /** registered sprint id, e.g. 'hld' */
  sprint: string;
  /** @deprecated legacy mirror of the sprint's short label — removed in Task 10 */
  type: string;
  category: string;
  status: Status;
  difficulty: Difficulty;
  notes: string;
  dateStarted: string | null;
  dateCompleted: string | null;
  lastRevisedAt?: string | null;
  revisionCount: number;
  /** spaced-repetition ladder index into SR_STEPS */
  srStep?: number;
  /** YYYY-MM-DD the topic is next due for review */
  srDue?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TodayItem {
  id: string;
  topicId: string | null;
  text: string;
  done: boolean;
  carried?: boolean;
}

export interface Filters {
  q: string;
  /** registered sprint id, or 'all' */
  sprint: string | 'all';
  /** @deprecated transitional mirror — removed in Task 10 */
  type: TopicType | 'all';
  category: string;
  status: Status | 'all';
  difficulty: Difficulty | 'all';
}

export type SortKey = 'default' | 'name' | 'difficulty' | 'xp' | 'recent';

export interface UiState {
  theme: 'dark' | 'light';
  view: ViewId;
  collapsed: Record<string, boolean>;
  filters: Filters;
  /** left rail state on desktop */
  sidebar?: 'expanded' | 'collapsed';
  sort?: SortKey;
  /** which sprint the 'sprint' view renders */
  activeSprint?: string | null;
}

export interface TrackerState {
  schema: number;
  topics: Topic[];
  today: { date: string; items: TodayItem[] };
  /** 'YYYY-MM-DD' -> completions that day */
  history: Record<string, number>;
  /** sids the user deleted: never re-seed them */
  removedSeeds: string[];
  /** achievement ids already celebrated, so an unlock only fires once */
  seenAchievements: string[];
  /** sprint ids the user has joined; scopes attention, never data */
  joinedSprints: string[];
  ui: UiState;
  createdAt: string;
  updatedAt: string;
}

export interface Stat {
  total: number;
  done: number;
  prog: number;
  rev: number;
  todo: number;
  pct: number;
}

export interface CategoryStat extends Stat {
  type: TopicType;
  cat: string;
  custom?: boolean;
}

export interface DifficultyStat extends Stat {
  d: Difficulty;
}

export interface Stats {
  all: Stat;
  /** per-registered-sprint totals, keyed by sprint id */
  bySprint: Record<string, Stat>;
  /** @deprecated derived alias kept for the documented console API */
  hld: Stat;
  /** @deprecated derived alias kept for the documented console API */
  lld: Stat;
  patterns: Stat;
  problems: Stat;
  hldProblems: Stat;
  lldProblems: Stat;
  needsRevision: Topic[];
  inProgress: Topic[];
  recent: Topic[];
  byCat: CategoryStat[];
  byDiff: DifficultyStat[];
}

export interface CommandResult {
  ok: boolean;
  msg: string;
  topic?: Topic;
  options?: Topic[];
}

export type ToastKind = '' | 'ok' | 'warn' | 'err';
