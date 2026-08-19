import type { Topic, TrackerState } from '../types';
import type { SprintDef } from '../data/sprints';
import { SPRINTS } from '../data/sprints';

/**
 * Topics belonging to a sprint the user has joined.
 *
 * Scopes ATTENTION only — sidebar, Quests, Review, Dashboard mission.
 * XP, levels, awards, streak and history stay lifetime-wide and must never
 * be computed from this list, or leaving a sprint would cost the user levels.
 */
export function activeTopics(state: TrackerState): Topic[] {
  const joined = new Set(state.joinedSprints);
  return state.topics.filter((t) => joined.has(t.sprint));
}

export function isJoined(state: TrackerState, sprintId: string): boolean {
  return state.joinedSprints.includes(sprintId);
}

/** joined sprints in registry order */
export function joinedSprintDefs(state: TrackerState): SprintDef[] {
  return SPRINTS.filter((s) => state.joinedSprints.includes(s.id));
}

/** registered sprints the user has not joined */
export function unjoinedSprintDefs(state: TrackerState): SprintDef[] {
  return SPRINTS.filter((s) => !state.joinedSprints.includes(s.id));
}
