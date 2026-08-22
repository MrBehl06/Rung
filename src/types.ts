export const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Needs Revision'] as const;
export const DIFFS = ['Easy', 'Medium', 'Hard'] as const;

export type Status = (typeof STATUSES)[number];
export type Difficulty = (typeof DIFFS)[number];

export type ViewId =
  | 'dashboard'
  | 'sprints'
  | 'sprint'
  | 'revision'
  | 'calendar'
  | 'saved'
  | 'rewards';

/** digit-shortcut order; the 'sprint' view is reached by click, not by number */
export const VIEWS: ViewId[] = [
  'dashboard', 'calendar', 'sprints', 'revision', 'saved', 'rewards',
];

export interface TopicLink {
  id: string;
  /** always http(s) — validated on the way in */
  url: string;
  /** optional; falls back to the URL's domain when shown */
  label: string;
}

export interface Topic {
  id: string;
  /** stable seed id — present only on catalogue rows, null on user-created topics */
  sid: string | null;
  name: string;
  /** registered sprint id, e.g. 'hld' */
  sprint: string;
  category: string;
  status: Status;
  difficulty: Difficulty;
  notes: string;
  /** blogs, videos and docs the user attached to this topic */
  links: TopicLink[];
  /** starred for quick recall */
  bookmarked: boolean;
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

export interface Filters {
  q: string;
  /** registered sprint id, or 'all' */
  sprint: string | 'all';
  /** show only starred topics */
  saved?: boolean;
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

export interface DayNote {
  /** raw text as typed; a line starting with "- " renders as a checkbox */
  text: string;
  /** indices of checkable lines currently ticked */
  checked: number[];
}

export interface TrackerState {
  schema: number;
  topics: Topic[];
  /** 'YYYY-MM-DD' -> completions that day */
  history: Record<string, number>;
  /** sids the user deleted: never re-seed them */
  removedSeeds: string[];
  /** sprint ids the user has joined; scopes attention, never data */
  joinedSprints: string[];
  /** 'YYYY-MM-DD' -> the note written for that day */
  dayNotes: Record<string, DayNote>;
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
  /** sprint short label, for display */
  type: string;
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
  /** derived alias kept for the documented console API */
  hld: Stat;
  /** derived alias kept for the documented console API */
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
