import type { SeedTopic, SprintDef } from './types';
import { hld } from './hld';
import { lld } from './lld';
import { blind75 } from './blind75';

export type { CategoryDef, SeedRow, SeedTopic, SprintDef, TeaserDef } from './types';
export { TEASERS } from './teasers';

/** Registration order is display order. Adding a sprint is one import + one entry. */
export const SPRINTS: SprintDef[] = [hld, lld, blind75];

export const SPRINT_IDS: string[] = SPRINTS.map((s) => s.id);

export function getSprint(id: string): SprintDef | undefined {
  return SPRINTS.find((s) => s.id === id);
}

/**
 * Coerce anything — a modern `sprint`, a legacy `type: 'HLD'`, command input,
 * a sprint whose data file was removed — into a registered sprint id.
 */
export function resolveSprint(value: unknown): string {
  const v = String(value ?? '').trim().toLowerCase();
  return SPRINT_IDS.includes(v) ? v : SPRINTS[0].id;
}

export function categoriesOf(id: string): string[] {
  return getSprint(id)?.categories.map((c) => c.name) ?? [];
}

/** ordering weight for suggestNext; unknown categories sort mid-pack */
export function categoryRank(sprintId: string, category: string): number {
  return getSprint(sprintId)?.categories.find((c) => c.name === category)?.rank ?? 26;
}

/**
 * Flatten the registry into seed rows.
 *
 * The `sid` format is frozen: changing it detaches every existing topic from
 * its catalogue row and the user loses all progress on the next load.
 */
export function seedRows(): SeedTopic[] {
  const out: SeedTopic[] = [];
  for (const sprint of SPRINTS) {
    for (const cat of sprint.categories) {
      cat.rows.forEach((row, i) => {
        out.push({
          sid: `${sprint.id}|${cat.name}|${row[0]}`.toLowerCase().replace(/\s+/g, '-'),
          name: row[0],
          sprint: sprint.id,
          category: cat.name,
          difficulty: row[1],
          status: row[2] ?? 'Not Started',
          order: i,
        });
      });
    }
  }
  return out;
}
