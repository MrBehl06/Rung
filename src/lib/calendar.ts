import type { Topic, TrackerState } from '../types';
import { dueDate } from './srs';
import { todayISO } from './utils';

export interface DayCell {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** past: completions logged that day */
  completions: number;
  /** 0–4 intensity bucket, matching the dashboard heatmap */
  level: number;
  /** future: reviews scheduled to land that day */
  dueReviews: number;
  /** the user wrote something for this day */
  hasNote: boolean;
}

export interface DayDetail {
  date: string;
  completed: Topic[];
  revised: Topic[];
  due: Topic[];
  /** completions history recorded that the topic list cannot name — see spec §8.3 */
  unaccounted: number;
}

/** local-midnight ISO for a Y/M/D, avoiding the UTC drift of toISOString() */
function iso(year: number, month: number, day: number): string {
  return todayISO(new Date(year, month, day));
}

/**
 * Six-week grid covering `month`, Sunday-first, including the leading and
 * trailing days of adjacent months so every row is full.
 *
 * `month` is 0-indexed, matching the Date constructor.
 */
export function monthGrid(state: TrackerState, year: number, month: number): DayCell[] {
  const today = todayISO();

  let max = 1;
  for (const k of Object.keys(state.history)) max = Math.max(max, state.history[k]);

  // reviews landing per day, from dueDate() so pre-SRS saves also project forward
  const dueByDate: Record<string, number> = {};
  for (const t of state.topics) {
    if (t.status !== 'Completed' && t.status !== 'Needs Revision') continue;
    const d = dueDate(t, today);
    if (d) dueByDate[d] = (dueByDate[d] ?? 0) + 1;
  }

  const first = new Date(year, month, 1);
  // step back to the Sunday on or before the 1st
  const start = new Date(year, month, 1 - first.getDay());
  const cells: DayCell[] = [];

  for (let i = 0; i < 42; i++) {
    // rebuild from Y/M/D rather than adding milliseconds, so DST cannot shift a day
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = todayISO(d);
    const completions = state.history[key] ?? 0;
    cells.push({
      date: key,
      inMonth: d.getMonth() === month && d.getFullYear() === year,
      isToday: key === today,
      isFuture: key > today,
      completions,
      level: completions > 0 ? Math.min(4, Math.ceil((completions / max) * 4)) : 0,
      dueReviews: key >= today ? (dueByDate[key] ?? 0) : 0,
      hasNote: Boolean(state.dayNotes[key]?.text.trim()),
    });
  }
  return cells;
}

export function dayDetail(state: TrackerState, date: string): DayDetail {
  const completed = state.topics.filter((t) => (t.dateCompleted ?? '').slice(0, 10) === date);
  const revised = state.topics.filter((t) => (t.lastRevisedAt ?? '').slice(0, 10) === date);
  const due = state.topics.filter((t) => dueDate(t) === date);
  return {
    date,
    completed,
    revised,
    due,
    // history counts completions; a topic only remembers its LATEST completion,
    // so a re-completed topic can leave an older day unattributable
    unaccounted: Math.max(0, (state.history[date] ?? 0) - completed.length),
  };
}

/**
 * Active days ÷ elapsed days for the displayed month.
 * Elapsed counts to today for the current month, the full month for a past
 * month, and returns null for a future month where the figure is meaningless.
 */
export function monthConsistency(state: TrackerState, year: number, month: number): number | null {
  const now = new Date();
  const isCurrent = now.getFullYear() === year && now.getMonth() === month;
  if (!isCurrent && new Date(year, month, 1) > now) return null;

  const elapsed = isCurrent ? now.getDate() : new Date(year, month + 1, 0).getDate();
  let active = 0;
  for (let d = 1; d <= elapsed; d++) if ((state.history[iso(year, month, d)] ?? 0) > 0) active++;
  return Math.round((active / elapsed) * 100);
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
