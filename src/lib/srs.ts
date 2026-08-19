import type { Topic, TrackerState } from '../types';
import { todayISO } from './utils';

/**
 * Spaced repetition, deliberately simple and explainable.
 * A clean recall walks up the ladder; a struggle drops back to the start.
 */
export const SR_STEPS = [1, 3, 7, 14, 30, 60, 120] as const;

export function stepDays(step: number): number {
  return SR_STEPS[Math.max(0, Math.min(SR_STEPS.length - 1, step))];
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** due date for a topic, falling back to a lazy seed for pre-SR saves */
export function dueDate(t: Topic, today = todayISO()): string | null {
  if (t.srDue) return t.srDue;
  // flagged for revision but never scheduled (pre-SR save) — it's due now
  if (t.status === 'Needs Revision') return today;
  if (t.status !== 'Completed' || !t.dateCompleted) return null;
  // legacy completed topic: treat it as one step in from its completion date
  return addDays(t.dateCompleted.slice(0, 10), stepDays(t.srStep ?? 0));
}

export function daysUntilDue(t: Topic, today = todayISO()): number | null {
  const due = dueDate(t, today);
  if (!due) return null;
  const a = new Date(today + 'T00:00:00').getTime();
  const b = new Date(due + 'T00:00:00').getTime();
  return Math.round((b - a) / 864e5);
}

export function isDue(t: Topic, today = todayISO()): boolean {
  const n = daysUntilDue(t, today);
  return n !== null && n <= 0;
}

export interface ReviewBuckets {
  /** due today or overdue */
  due: Topic[];
  /** explicitly flagged Needs Revision */
  flagged: Topic[];
  /** scheduled, not yet due */
  upcoming: Topic[];
}

export function reviewBuckets(
  state: TrackerState,
  today = todayISO(),
  /** scoped pool — pass activeTopics(state) to pause left sprints' reviews */
  pool?: Topic[],
): ReviewBuckets {
  const topics = pool ?? state.topics;

  const flagged = topics
    .filter((t) => t.status === 'Needs Revision')
    .sort((a, b) => String(a.dateCompleted ?? '').localeCompare(String(b.dateCompleted ?? '')));

  const completed = topics.filter((t) => t.status === 'Completed');

  const due = completed
    .filter((t) => isDue(t, today))
    .sort((a, b) => (daysUntilDue(a, today) ?? 0) - (daysUntilDue(b, today) ?? 0));

  const upcoming = completed
    .filter((t) => !isDue(t, today) && dueDate(t, today))
    .sort((a, b) => (daysUntilDue(a, today) ?? 0) - (daysUntilDue(b, today) ?? 0));

  return { due, flagged, upcoming };
}

/** human label for a due offset */
export function dueLabel(days: number | null): string {
  if (days === null) return 'unscheduled';
  if (days < -1) return `${Math.abs(days)}d overdue`;
  if (days === -1) return 'yesterday';
  if (days === 0) return 'due today';
  if (days === 1) return 'tomorrow';
  return `in ${days}d`;
}
