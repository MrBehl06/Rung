import type { Difficulty, Status } from '../../types';

/** [name, difficulty] or [name, difficulty, initialStatus] */
export type SeedRow = [string, Difficulty] | [string, Difficulty, Status];

export interface CategoryDef {
  name: string;
  /** ordering weight for suggestNext — lower is studied earlier */
  rank: number;
  rows: SeedRow[];
}

/**
 * A curriculum the user can join.
 *
 * `id` is PERMANENT. It is baked into every topic's `sid`
 * (`${id}|${category}|${name}`), which is how progress survives a redeploy.
 * Renaming an id orphans every topic in that sprint.
 */
export interface SprintDef {
  id: string;
  name: string;
  /** short label for sidebar rows and badges */
  short: string;
  tagline: string;
  icon: string;
  /** CSS color — drives the --sprint custom property */
  accent: string;
  categories: CategoryDef[];
}

/** A sprint with no content yet. Rendered locked on the hub. */
export interface TeaserDef {
  id: string;
  name: string;
  blurb: string;
  icon: string;
}

export interface SeedTopic {
  sid: string;
  name: string;
  sprint: string;
  category: string;
  difficulty: Difficulty;
  status: Status;
  order: number;
}
