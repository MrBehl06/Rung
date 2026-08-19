/**
 * TRANSITIONAL SHIM — deleted in Task 10.
 *
 * Keyed by SprintDef.short ('HLD' / 'LLD') so pre-migration consumers doing
 * `CATS[topic.type]` keep compiling while they are migrated one file at a time.
 */
import { SPRINTS } from './sprints';

export const CATS: Record<string, string[]> = Object.fromEntries(
  SPRINTS.map((s) => [s.short, s.categories.map((c) => c.name)]),
);

export { seedRows } from './sprints';
export type { SeedTopic } from './sprints';
