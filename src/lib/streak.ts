import type { TrackerState } from '../types';
import { todayISO } from './utils';

/** how many days a week you aim to touch the tracker */
export const WEEKLY_TARGET = 5;

export interface WeekProgress {
  /** active days so far this week */
  hit: number;
  target: number;
  /** Mon–Sun, true where something was completed */
  days: boolean[];
  done: boolean;
}

/**
 * Consecutive days with at least one completion, counting back from today.
 * Yesterday still counts as alive, so opening the app before you have done
 * anything today does not read as a broken streak.
 */
export function completionStreak(state: TrackerState): number {
  const active = new Set(Object.keys(state.history).filter((k) => state.history[k] > 0));
  if (!active.size) return 0;
  let streak = 0;
  let cur = new Date();
  if (!active.has(todayISO(cur))) cur = new Date(Date.now() - 864e5);
  while (active.has(todayISO(cur))) {
    streak++;
    cur = new Date(cur.getTime() - 864e5);
  }
  return streak;
}

export function longestStreak(state: TrackerState): number {
  const days = Object.keys(state.history).filter((k) => state.history[k] > 0).sort();
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

/**
 * Progress against this week's target, Monday-based.
 *
 * A weekly target is the forgiving half of the pair: missing Tuesday costs
 * nothing as long as the week still lands, which is what keeps a bad week
 * from turning into a quit.
 */
export function weekProgress(state: TrackerState, target = WEEKLY_TARGET): WeekProgress {
  const now = new Date();
  // getDay() is Sunday-first; shift so Monday starts the week
  const offset = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);

  const days: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    days.push((state.history[todayISO(d)] ?? 0) > 0);
  }
  const hit = days.filter(Boolean).length;
  return { hit, target, days, done: hit >= target };
}
