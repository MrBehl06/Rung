# Interview Sprints, Calendar & Visual Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `HLD | LLD` type union with an extensible Sprint registry the user joins and leaves, add a Calendar showing past activity and scheduled reviews, and refresh the visual language — without losing a single byte of existing user progress.

**Architecture:** A `SprintDef` registry (one module per sprint) replaces the closed `TopicType` union. `Topic.type` becomes `Topic.sprint`, and because sprint ids are the lowercase strings `hld` / `lld`, every derived seed id (`sid`) stays byte-identical, so the existing non-destructive merge in `loadState` keeps all progress. Enrollment (`TrackerState.joinedSprints`) scopes *attention* — sidebar, Quests, Review, Dashboard mission — while XP, level, awards and streak stay lifetime-wide. The Calendar is pure derivation over `state.history` (past) and `srs.dueDate()` (future); no new stored state.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7. No runtime dependencies beyond `react` / `react-dom`. localStorage only.

**Spec:** `docs/superpowers/specs/2026-08-18-interview-sprints-design.md`

## Global Constraints

- **No automated tests.** No test runner is added, no test files are created, no test dependency is installed. Verification is manual per spec §11 (V1–V5). Task steps close with typecheck/build plus targeted manual checks.
- **`KEY` in `src/lib/storage.ts` stays `'hld-lld-tracker/v1'`.** Changing it orphans every existing user.
- **Sprint ids are permanent.** `hld` and `lld` are baked into every `sid`. Renaming one orphans its topics.
- **`sid` derivation must not change:** `` `${sprintId}|${cat}|${name}`.toLowerCase().replace(/\s+/g,'-') ``.
- **No mutation.** Follow the codebase's existing immutable style; `store.produce` clones before mutating a draft.
- **Every file under `src/` stays below 800 lines.**
- Explicit types on exported functions. No `any`. No `console.log` left behind.
- Both `dark` and `light` themes must be complete for every new surface.
- `npm run build` (`tsc --noEmit && vite build`) must pass at the end of every task.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/data/sprints/types.ts` | `SprintDef`, `CategoryDef`, `TeaserDef`, `SeedRow`, `SeedTopic` |
| `src/data/sprints/hld.ts` | The HLD sprint definition — 54 topics, 5 categories |
| `src/data/sprints/lld.ts` | The LLD sprint definition — 60 topics, 5 categories |
| `src/data/sprints/teasers.ts` | Locked roadmap cards: id, name, blurb, icon. No topics |
| `src/data/sprints/index.ts` | `SPRINTS` registry, `getSprint`, `resolveSprint`, `categoriesOf`, `seedRows`, `TEASERS` |
| `src/lib/scope.ts` | `activeTopics` — the single definition of "joined" |
| `src/lib/calendar.ts` | `monthGrid`, `dayDetail`, `monthConsistency` — pure, no React |
| `src/views/Sprints.tsx` | The hub: your sprints, explore, locked teasers |
| `src/views/Calendar.tsx` | Month grid, streak header, day detail panel |
| `src/components/SprintCard.tsx` | One hub card — joined and unjoined states |
| `src/styles/tokens.css` | Palette, radii, type scale, easing, `--sprint` contract |
| `src/styles/base.css` | Reset, body, focus, typography primitives |
| `src/styles/layout.css` | Shell, sidebar, topbar, mobile nav, drawers |
| `src/styles/components.css` | Buttons, rows, chips, modals, toasts, palette |
| `src/styles/views.css` | Per-view styles including sprints + calendar |

**Modified:** `src/types.ts`, `src/lib/model.ts`, `src/lib/storage.ts`, `src/lib/stats.ts`, `src/lib/game.ts`, `src/lib/srs.ts`, `src/lib/store.ts`, `src/lib/commands.ts`, `src/components/Sidebar.tsx`, `src/components/hud.tsx`, `src/components/TopicModal.tsx`, `src/components/Palette.tsx`, `src/views/TopicsView.tsx`, `src/views/Dashboard.tsx`, `src/views/Guide.tsx`, `src/App.tsx`, `src/main.tsx`, `README.md`

**Deleted (Task 10):** `src/data/seed.ts`, `src/styles.css`

**Transitional compilation strategy:** Task 1 adds `Topic.sprint` as canonical while keeping `Topic.type?` as a deprecated mirror populated by `makeTopic`. Every consumer therefore keeps compiling while Tasks 2–8 migrate them one at a time. Task 10 removes the mirror. **The tree compiles after every single task.**

---

## Phase 0 — Restore point

### Task 0: Establish a restore point

**Files:**
- Modify: `.gitignore` (verify only)

> ⚠️ **Needs the user's go-ahead.** This directory is not a git repository. This refactor touches nearly every file in `src/`, so a restore point matters. If the user declines, take a manual copy of the folder instead and skip every `git commit` step in this plan.

- [ ] **Step 1: Confirm the repo state**

Run: `git rev-parse --is-inside-work-tree`
Expected: `fatal: not a git repository`

- [ ] **Step 2: Verify `.gitignore` excludes build output and dependencies**

Run: `cat .gitignore`
Expected: contains `node_modules` and `dist`. If either is missing, append it.

- [ ] **Step 3: Initialise and take the baseline commit**

```bash
git init
git add -A
git commit -m "chore: baseline before interview sprints refactor"
```

- [ ] **Step 4: Confirm the working tree is clean**

Run: `git status --short`
Expected: no output.

---

## Phase 1 — Registry and migration (the data-safety phase)

### Task 1: Sprint registry + `Topic.sprint` migration

This is the highest-risk task in the plan. It is done first, and verified against a real backup, so a mistake is caught before the refactor spreads.

**Files:**
- Create: `src/data/sprints/types.ts`, `src/data/sprints/hld.ts`, `src/data/sprints/lld.ts`, `src/data/sprints/teasers.ts`, `src/data/sprints/index.ts`
- Modify: `src/data/seed.ts` (becomes a shim), `src/types.ts`, `src/lib/model.ts`, `src/lib/storage.ts`

**Interfaces:**
- Produces: `SPRINTS: SprintDef[]`, `getSprint(id: string): SprintDef | undefined`, `resolveSprint(v: unknown): string`, `categoriesOf(id: string): string[]`, `seedRows(): SeedTopic[]`, `TEASERS: TeaserDef[]`, `Topic.sprint: string`, `TrackerState.joinedSprints: string[]`, `UiState.activeSprint: string | null`

- [ ] **Step 1: Capture the pre-change seed ids — do this BEFORE editing anything**

Run `npm run dev`, open the app, and in the browser console run:

```js
copy(tracker.topics().map(t => t.sid).filter(Boolean).sort().join('\n'))
```

Paste the clipboard into `/tmp/sids-before.txt`. Then export a data backup from the console:

```js
tracker.export()
```

This downloads `hld-lld-tracker-<date>.json`. **Keep it — it is the restore path for this task.**

- [ ] **Step 2: Create the registry types**

Create `src/data/sprints/types.ts`:

```ts
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
```

- [ ] **Step 3: Create the HLD sprint**

Create `src/data/sprints/hld.ts`. Copy the five HLD category arrays from `src/data/seed.ts` **verbatim** — every name, difficulty and initial status must match exactly, or `sid`s change and progress is lost. Ranks come from the old `CAT_RANK` map in `src/lib/stats.ts`.

```ts
import type { SprintDef } from './types';

export const hld: SprintDef = {
  id: 'hld',
  name: 'High Level Design',
  short: 'HLD',
  tagline: 'Design systems that survive scale',
  icon: '🏗',
  accent: 'var(--hld)',
  categories: [
    {
      name: 'Fundamentals',
      rank: 0,
      rows: [
        ['Functional vs Non-Functional Requirements', 'Easy'],
        ['Scalability', 'Easy'],
        ['Availability & Reliability', 'Medium'],
        ['Latency vs Throughput', 'Easy'],
        ['CAP Theorem', 'Medium'],
        ['Consistency & Eventual Consistency', 'Medium'],
        ['Vertical vs Horizontal Scaling', 'Easy'],
        ['Monolith vs Microservices', 'Medium'],
      ],
    },
    { name: 'Core Components', rank: 8, rows: [/* copy all 10 rows verbatim from seed.ts */] },
    { name: 'Database & Storage', rank: 14, rows: [/* copy all 8 rows verbatim */] },
    { name: 'Distributed Systems', rank: 24, rows: [/* copy all 7 rows verbatim */] },
    { name: 'HLD Problems', rank: 32, rows: [/* copy all 21 rows verbatim */] },
  ],
};
```

Fill every `rows` array with the real rows from `seed.ts` — the comments above mark where, they are not placeholders to leave in. Category **order** must match the old `CATS.HLD` array, since it drives skill-tree unlocking.

- [ ] **Step 4: Create the LLD sprint**

Create `src/data/sprints/lld.ts` the same way, using `CATS.LLD` order and the old ranks: `Principles` 0, `Creational Patterns` 8, `Structural Patterns` 12, `Behavioral Patterns` 18, `LLD Problems` 32.

```ts
import type { SprintDef } from './types';

export const lld: SprintDef = {
  id: 'lld',
  name: 'Low Level Design',
  short: 'LLD',
  tagline: 'Objects, patterns, and code that reads clean',
  icon: '🔬',
  accent: 'var(--lld)',
  categories: [
    { name: 'Principles', rank: 0, rows: [['SOLID Principles', 'Medium', 'Completed']] },
    { name: 'Creational Patterns', rank: 8, rows: [/* copy all 5 rows verbatim */] },
    { name: 'Structural Patterns', rank: 12, rows: [/* copy all 7 rows verbatim */] },
    { name: 'Behavioral Patterns', rank: 18, rows: [/* copy all 11 rows verbatim */] },
    { name: 'LLD Problems', rank: 32, rows: [/* copy all 36 rows verbatim */] },
  ],
};
```

The pre-marked `'Completed'` statuses on `SOLID Principles`, `Factory`, `Decorator`, `Observer` and `Strategy` must be preserved.

- [ ] **Step 5: Create the teaser cards**

Create `src/data/sprints/teasers.ts`:

```ts
import type { TeaserDef } from './types';

/** Roadmap cards. Rendered locked — clicking explains rather than doing nothing. */
export const TEASERS: TeaserDef[] = [
  { id: 'striver', name: 'Striver DSA', blurb: 'The A2Z sheet — arrays to graphs to DP', icon: '🧮' },
  { id: 'behavioral', name: 'Behavioural', blurb: 'STAR stories, leadership principles, the human round', icon: '🗣' },
];
```

- [ ] **Step 6: Create the registry**

Create `src/data/sprints/index.ts`:

```ts
import type { SeedTopic, SprintDef } from './types';
import { hld } from './hld';
import { lld } from './lld';

export type { CategoryDef, SeedRow, SeedTopic, SprintDef, TeaserDef } from './types';
export { TEASERS } from './teasers';

/** Registration order is display order. Adding a sprint is one import + one entry. */
export const SPRINTS: SprintDef[] = [hld, lld];

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
```

- [ ] **Step 7: Reduce `seed.ts` to a transitional shim**

Replace the entire contents of `src/data/seed.ts`:

```ts
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
```

- [ ] **Step 8: Add the new fields to `src/types.ts`**

In `src/types.ts`, delete the `TYPES` const and the `TopicType` type alias export is **kept for now** as a transitional alias. Apply exactly:

```ts
export const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Needs Revision'] as const;
export const DIFFS = ['Easy', 'Medium', 'Hard'] as const;

export type Status = (typeof STATUSES)[number];
export type Difficulty = (typeof DIFFS)[number];

/** @deprecated transitional — removed in Task 10. Use the sprint id string. */
export type TopicType = string;

export type ViewId =
  | 'dashboard'
  | 'sprints'
  | 'sprint'
  | 'today'
  | 'revision'
  | 'calendar'
  | 'awards'
  | 'guide';

/** digit-shortcut order; the 'sprint' view is reached by click, not by number */
export const VIEWS: ViewId[] = [
  'dashboard', 'sprints', 'today', 'revision', 'calendar', 'awards', 'guide',
];
```

In the `Topic` interface, replace `type: TopicType;` with:

```ts
  /** registered sprint id, e.g. 'hld' */
  sprint: string;
  /** @deprecated legacy mirror of sprint.short — removed in Task 10 */
  type?: string;
```

In `Filters`, add `sprint: string | 'all';` and keep `type: TopicType | 'all';` for now.

In `UiState`, add `activeSprint?: string | null;`.

In `TrackerState`, add above `ui`:

```ts
  /** sprint ids the user has joined; scopes attention, never data */
  joinedSprints: string[];
```

In `Stats`, add `bySprint: Record<string, Stat>;` and keep `hld` / `lld`.

- [ ] **Step 9: Bump the schema**

In `src/lib/storage.ts` change `export const SCHEMA = 1;` to `export const SCHEMA = 2;`. **Do not touch `KEY`.**

- [ ] **Step 10: Migrate in `src/lib/model.ts`**

Replace the imports and `makeTopic` / `blankState`, and add migration to `loadState`:

```ts
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
      filters: { q: '', sprint: 'all', type: 'all', category: 'all', status: 'all', difficulty: 'all' },
    },
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
}
```

In `makeTopic`, replace the `type` resolution with:

```ts
  const sprint = resolveSprint(o.sprint ?? o.type);
  const def = getSprint(sprint) ?? SPRINTS[0];
```

and in the returned object replace `type,` and the `category` line with:

```ts
    sprint,
    type: def.short,                                  // deprecated mirror, dropped in Task 10
    category: o.category || def.categories[0].name,
```

- [ ] **Step 11: Migrate UI state and `joinedSprints` in `loadState`**

Inside `loadState`, immediately after `state.topics = saved.topics.map(makeTopic);`, insert:

```ts
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
    const legacyFilter = (state.ui.filters as { type?: string }).type;
    if (state.ui.filters.sprint == null) {
      state.ui.filters.sprint =
        legacyFilter && legacyFilter !== 'all' ? resolveSprint(legacyFilter) : 'all';
    }
```

And in the `else { state = blank; }` branch, add so a genuinely fresh user picks first:

```ts
  } else {
    state = blank;
    state.ui.view = 'sprints';
  }
```

- [ ] **Step 12: Typecheck**

Run: `npm run typecheck`
Expected: PASS. The deprecated `Topic.type` mirror keeps every unmigrated consumer compiling.

- [ ] **Step 13: V1 — prove no data was lost**

Run `npm run dev`, open the app, and in the console:

```js
tracker.topics().length          // must equal the pre-change count
tracker.level()                  // level, rank and xp must be unchanged
tracker.streak()                 // must be unchanged
tracker.awards().filter(a => a.unlocked).length   // must be unchanged
tracker.data().joinedSprints     // must be ['hld','lld']
copy(tracker.topics().map(t => t.sid).filter(Boolean).sort().join('\n'))
```

Paste into `/tmp/sids-after.txt` and run:

```bash
diff /tmp/sids-before.txt /tmp/sids-after.txt
```

Expected: **no output.** Any difference means a name, category or status was mistyped in Steps 3–4 — fix it before continuing. If the app looks wrong, import the backup from Step 1 to restore.

Also spot-check three previously-completed topics still show Completed with their notes and `revisionCount` intact, and confirm no previously-deleted catalogue row has reappeared.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: add sprint registry and migrate Topic.type to Topic.sprint"
```

---

## Phase 2 — Migrate the logic layer

### Task 2: Sprint-aware stats

**Files:**
- Modify: `src/lib/stats.ts`

**Interfaces:**
- Consumes: `SPRINTS`, `categoriesOf`, `categoryRank` from Task 1
- Produces: `Stats.bySprint: Record<string, Stat>`; `statsForSprint(state, id): Stat`

- [ ] **Step 1: Replace the hardcoded sprint filters**

In `src/lib/stats.ts`, swap the imports:

```ts
import { DIFFS } from '../types';
import { SPRINTS, categoriesOf, categoryRank } from '../data/sprints';
```

Add above `computeStats`:

```ts
export function statsForSprint(state: TrackerState, sprintId: string): Stat {
  return statsFor(state.topics.filter((t) => t.sprint === sprintId));
}
```

In `computeStats`, replace the `hld` / `lld` consts and the `byCat` loop:

```ts
  const all = state.topics;
  const bySprint: Record<string, Stat> = {};
  for (const s of SPRINTS) bySprint[s.id] = statsFor(all.filter((t) => t.sprint === s.id));

  const hld = all.filter((t) => t.sprint === 'hld');
  const lld = all.filter((t) => t.sprint === 'lld');
  const patterns = lld.filter((t) => /Patterns$/.test(t.category));
  const problems = all.filter((t) => /Problems$/.test(t.category));

  const byCat: CategoryStat[] = [];
  for (const s of SPRINTS) {
    for (const cat of categoriesOf(s.id)) {
      const list = all.filter((t) => t.sprint === s.id && t.category === cat);
      if (list.length) byCat.push({ type: s.short, cat, ...statsFor(list) });
    }
  }
  for (const t of all) {
    if (
      !categoriesOf(t.sprint).includes(t.category) &&
      !byCat.some((c) => c.cat === t.category)
    ) {
      const list = all.filter((x) => x.sprint === t.sprint && x.category === t.category);
      byCat.push({ type: t.sprint, cat: t.category, custom: true, ...statsFor(list) });
    }
  }
```

Add `bySprint,` to the returned object. Keep `hld:` and `lld:` — they are the documented console API.

- [ ] **Step 2: Replace `CAT_RANK` with registry ranks**

Delete the `CAT_RANK` const entirely and change the `weight` function inside `suggestNext`:

```ts
    w += categoryRank(t.sprint, t.category);
```

- [ ] **Step 3: Typecheck and verify**

Run: `npm run typecheck` → PASS

Then `npm run dev` and in the console:

```js
tracker.stats().bySprint      // { hld: {...}, lld: {...} } with correct totals
tracker.stats().hld.pct       // unchanged from before this task
tracker.next(5)               // still returns sensible fundamentals-first ordering
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: derive stats from the sprint registry"
```

### Task 3: Sprint-aware awards and skill tree

**Files:**
- Modify: `src/lib/game.ts`

**Interfaces:**
- Produces: `skillTree(state, sprintId): TreeNode[]` (signature change — was `(state, type, order)`); `TreeNode.sprint: string` replaces `TreeNode.type`

- [ ] **Step 1: Generate the per-sprint master awards**

In `src/lib/game.ts`, add the import:

```ts
import { SPRINTS, categoriesOf, getSprint } from '../data/sprints';
```

In `achievements`, delete these two lines from the `raw` array literal:

```ts
    { id: 'hld-master', name: 'HLD Master', desc: 'Complete every HLD topic', icon: '🏗️', tier: 'legendary', cur: s.hld.done, target: Math.max(1, s.hld.total) },
    { id: 'lld-master', name: 'LLD Master', desc: 'Complete every LLD topic', icon: '🔬', tier: 'legendary', cur: s.lld.done, target: Math.max(1, s.lld.total) },
```

Then insert this loop after the `raw` array literal ends and before the `return` statement:

```ts
  // one legendary "clear the sprint" award per registered sprint
  for (const sp of SPRINTS) {
    const st = s.bySprint[sp.id];
    if (!st || !st.total) continue;
    raw.push({
      id: `${sp.id}-master`,
      name: `${sp.short} Master`,
      desc: `Complete every ${sp.short} topic`,
      icon: sp.icon,
      tier: 'legendary',
      cur: st.done,
      target: Math.max(1, st.total),
    });
  }
```

`raw` is already declared `const` and arrays are mutable through a `const` binding, so no declaration change is needed.

> Two notes. The existing `seenAchievements` list keys on id, and `hld-master` / `lld-master` are regenerated with the **same ids**, so no unlock re-celebrates. The master awards now render at the end of the Awards grid rather than mid-list — a cosmetic ordering change, intentional, because generated entries must follow the static ones.

- [ ] **Step 2: Make the skill tree read the registry**

Replace the whole `skillTree` function and `TreeNode` interface:

```ts
export interface TreeNode {
  cat: string;
  sprint: string;
  done: number;
  total: number;
  pct: number;
  unlocked: boolean;
  mastered: boolean;
  index: number;
}

const UNLOCK_AT = 40; // % of the previous node required

export function skillTree(state: TrackerState, sprintId: string): TreeNode[] {
  const nodes: TreeNode[] = [];
  let prevPct = 100; // first node is always open
  categoriesOf(sprintId).forEach((cat, index) => {
    const list = state.topics.filter((t) => t.sprint === sprintId && t.category === cat);
    const done = list.filter((t) => t.status === 'Completed').length;
    const total = list.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    nodes.push({
      cat, sprint: sprintId, done, total, pct,
      unlocked: prevPct >= UNLOCK_AT,
      mastered: total > 0 && done === total,
      index,
    });
    prevPct = pct;
  });
  return nodes;
}
```

- [ ] **Step 3: Fix the `SkillTree` component for the renamed field**

In `src/components/hud.tsx`, in the `SkillTree` component change the `onPick` prop type to `(cat: string, sprint: string) => void`, and replace the three `n.type === 'LLD' ? …` expressions with sprint-driven values:

```tsx
            ['--rail' as string]: `var(--sprint, var(--hld))`,
```

```tsx
          onClick={() => onPick(n.cat, n.sprint)}
```

```tsx
            <Meter p={n.pct} cls="sprint" seg />
```

Add the `--sprint` fallback rule in Task 12; until then it resolves to `var(--hld)`.

- [ ] **Step 4: Fix the one existing caller**

In `src/views/TopicsView.tsx` line ~90, change `skillTree(state, scope, CATS[scope])` to `skillTree(state, scope)`. `scope` becomes a sprint id in Task 6; for now pass `scope.toLowerCase()`.

- [ ] **Step 5: Typecheck and verify**

Run: `npm run typecheck` → PASS

`npm run dev`, then in the console:

```js
tracker.awards().filter(a => a.unlocked).length   // unchanged from Task 1
tracker.awards().map(a => a.id).filter(i => i.endsWith('-master'))  // ['hld-master','lld-master']
```

Open an HLD topics view and confirm the skill tree still renders five nodes with the same unlock states.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: generate awards and skill tree from the sprint registry"
```

### Task 4: Enrollment scoping

**Files:**
- Create: `src/lib/scope.ts`
- Modify: `src/lib/srs.ts`, `src/lib/stats.ts`

**Interfaces:**
- Produces: `activeTopics(state): Topic[]`, `isJoined(state, id): boolean`, `joinedSprintDefs(state): SprintDef[]`
- `reviewBuckets(state, today?, pool?)` — new optional third parameter

- [ ] **Step 1: Create the single definition of "joined"**

Create `src/lib/scope.ts`:

```ts
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
```

- [ ] **Step 2: Let `reviewBuckets` take a scoped pool**

In `src/lib/srs.ts`, change the signature and the two source lines:

```ts
export function reviewBuckets(
  state: TrackerState,
  today = todayISO(),
  pool?: Topic[],
): ReviewBuckets {
  const topics = pool ?? state.topics;

  const flagged = topics
    .filter((t) => t.status === 'Needs Revision')
    .sort((a, b) => String(a.dateCompleted ?? '').localeCompare(String(b.dateCompleted ?? '')));

  const completed = topics.filter((t) => t.status === 'Completed');
  // …rest unchanged
```

- [ ] **Step 3: Scope `suggestNext`**

In `src/lib/stats.ts`, add the import `import { activeTopics } from './scope';` and change the final chain in `suggestNext`:

```ts
  return activeTopics(state)
    .filter((t) => t.status !== 'Completed')
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck` → PASS. Callers of `reviewBuckets` are unaffected — the new parameter is optional.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add enrollment scoping helpers"
```

### Task 5: Store — join, leave, and sprint-aware mutations

**Files:**
- Modify: `src/lib/store.ts`

**Interfaces:**
- Produces: `store.joinSprint(id)`, `store.leaveSprint(id)`, `store.openSprint(id)`; `store.moveTopic(id, sprintId, category)`; `store.bulkMove(ids, sprintId, category)`

- [ ] **Step 1: Update imports and `produce`**

In `src/lib/store.ts` replace the seed import:

```ts
import { SPRINTS, categoriesOf, getSprint, resolveSprint } from '../data/sprints';
```

and delete `import { STATUSES, TYPES } from '../types';` in favour of `import { STATUSES } from '../types';`.

In `produce`, add `joinedSprints` to the clone so a mutation can never alias the previous array:

```ts
      joinedSprints: [...this.state.joinedSprints],
```

- [ ] **Step 2: Add join / leave / open**

Add to the `// ---------- ui ----------` section:

```ts
  joinSprint(id: string): void {
    if (!getSprint(id) || this.state.joinedSprints.includes(id)) return;
    this.produce((d) => {
      d.joinedSprints = [...d.joinedSprints, id];
    });
    toast(`Joined ${getSprint(id)?.name}`, 'ok');
  }

  /**
   * Leaving hides a sprint from the sidebar, Quests and Review.
   * Nothing is deleted — XP, awards, streak and every topic stay exactly as they are.
   */
  leaveSprint(id: string): void {
    if (!this.state.joinedSprints.includes(id)) return;
    this.checkpoint();
    this.produce((d) => {
      d.joinedSprints = d.joinedSprints.filter((x) => x !== id);
      if (d.ui.activeSprint === id) {
        d.ui.activeSprint = d.joinedSprints[0] ?? null;
        if (!d.ui.activeSprint) d.ui.view = 'sprints';
      }
    });
    toastUndo(`Left ${getSprint(id)?.name} — progress kept`, () => this.undo(), 'ok');
  }

  openSprint(id: string): void {
    if (!getSprint(id)) return;
    this.produce((d) => {
      d.ui.view = 'sprint';
      d.ui.activeSprint = id;
      d.ui.filters.sprint = id;
    });
  }
```

- [ ] **Step 3: Make view switching and filters sprint-aware**

Replace `switchView` and `clearFilters`:

```ts
  switchView(view: ViewId): void {
    this.produce((d) => {
      d.ui.view = view;
      if (view === 'sprint') {
        const id = d.ui.activeSprint ?? d.joinedSprints[0] ?? SPRINTS[0].id;
        d.ui.activeSprint = id;
        d.ui.filters.sprint = id;
      }
    });
  }

  clearFilters(): void {
    const { view, activeSprint } = this.state.ui;
    this.setFilters({
      q: '',
      sprint: view === 'sprint' && activeSprint ? activeSprint : 'all',
      category: 'all',
      status: 'all',
      difficulty: 'all',
    });
  }
```

- [ ] **Step 4: Make topic mutations use sprint ids**

In `updateTopic`, replace the two validation lines:

```ts
      t.sprint = resolveSprint(t.sprint);
      if (!categoriesOf(t.sprint).includes(t.category) && !patch.category)
        t.category = categoriesOf(t.sprint)[0];
```

In `moveTopic` and `bulkMove`, rename the `type: TopicType` parameter to `sprintId: string` and replace the bodies' type handling with:

```ts
        t.sprint = resolveSprint(sprintId);
        t.category = categoriesOf(t.sprint).includes(category) ? category : categoriesOf(t.sprint)[0];
```

- [ ] **Step 5: Typecheck and verify**

Run: `npm run typecheck` → PASS

`npm run dev`, then in the console:

```js
tracker.data().joinedSprints          // ['hld','lld']
tracker.data().ui.activeSprint        // null or a valid sprint id
```

The store instance is module-private, so join/leave cannot be exercised from the console until the API lands in Task 8. For this task confirm only that the app boots, every topic still renders, and switching views does not throw.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add sprint join/leave and sprint-aware store mutations"
```

### Task 6: Commands and palette

**Files:**
- Modify: `src/lib/commands.ts`, `src/components/Palette.tsx`

**Interfaces:**
- Produces: `findCategory(text): { sprint: string; cat: string } | null` (field rename from `type`)

- [ ] **Step 1: Make category lookup search every registered sprint**

In `src/lib/commands.ts` replace the seed import with `import { SPRINTS, categoriesOf, getSprint, resolveSprint } from '../data/sprints';`, drop the `TYPES` / `TopicType` imports, and replace `findCategory`:

```ts
export function findCategory(text: string): { sprint: string; cat: string } | null {
  const q = norm(text);
  if (!q) return null;
  for (const s of SPRINTS)
    for (const c of categoriesOf(s.id)) if (norm(c) === q) return { sprint: s.id, cat: c };
  for (const s of SPRINTS) {
    for (const c of categoriesOf(s.id)) {
      if (norm(c).includes(q) || q.includes(norm(c))) return { sprint: s.id, cat: c };
    }
  }
  return null;
}
```

- [ ] **Step 2: Make `add` and `move` sprint-aware**

In the `add` command, replace the type-detection block:

```ts
      let sprint: string | null = null;
      let cat: string | null = null;

      const ids = SPRINTS.map((s) => s.id).join('|');
      const asSprint = rest.match(new RegExp(`\\b(?:as|in|under|to)\\s+(${ids})\\b`, 'i'));
      if (asSprint) {
        sprint = resolveSprint(asSprint[1]);
        rest = rest.replace(asSprint[0], '').trim();
      }
      const toCat = rest.match(/\s+(?:to|in|under)\s+(.+)$/i);
      if (toCat && toCat.index != null) {
        const f = findCategory(toCat[1]);
        if (f) {
          cat = f.cat;
          sprint = sprint ?? f.sprint;
          rest = rest.slice(0, toCat.index).trim();
        }
      }
      rest = rest.replace(/^(?:topic|problem|pattern)\s+/i, '').replace(/["'`]/g, '').trim();
      if (!rest) return { ok: false, msg: 'What should I add?' };
      if (!sprint) sprint = SPRINTS[0].id;
      if (!cat) cat = categoriesOf(sprint).at(-1) ?? categoriesOf(sprint)[0];

      const t = store.addTopic({ name: rest, sprint, category: cat });
      return t
        ? { ok: true, msg: `Added “${t.name}” to ${getSprint(t.sprint)?.short} · ${t.category}`, topic: t }
        : { ok: false, msg: 'Could not add that.' };
```

In the generic `move … to …` command, replace the two `f.type` references with `f.sprint` and the message with `` `Moved “${r.hit.name}” → ${getSprint(f.sprint)?.short} · ${f.cat}` ``.

- [ ] **Step 3: Make progress replies registry-driven**

Replace `progressReply`'s fallthrough line so new sprints appear automatically:

```ts
  const per = SPRINTS.map((sp) => `${sp.short} ${s.bySprint[sp.id]?.pct ?? 0}%`).join(' · ');
  return `Overall: ${s.all.done}/${s.all.total} (${s.all.pct}%) · ${per} · ${s.needsRevision.length} need revision`;
```

Also change the `suggestNext` reply's `t.type` to `` getSprint(t.sprint)?.short ``.

- [ ] **Step 4: Fix the `show/open/find` command's view switch**

```ts
      store.switchView('sprints');
      store.setFilters({ q, sprint: 'all' });
```

- [ ] **Step 5: Update the palette**

In `src/components/Palette.tsx`, replace any `topic.type` display with `getSprint(topic.sprint)?.short` and any `'hld'` / `'lld'` view navigation with `store.openSprint('hld')` style calls. Grep first: `grep -n "type\|hld\|lld" src/components/Palette.tsx`.

- [ ] **Step 6: Typecheck and verify**

Run: `npm run typecheck` → PASS

`npm run dev`, then in the console:

```js
tracker.run('add Design Reddit to HLD Problems')   // → Added ... to HLD · HLD Problems
tracker.run('move Singleton to Behavioral Patterns')
tracker.run('show my HLD progress')
tracker.run('what should I study next')
tracker.remove('Design Reddit')                    // clean up the test topic
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "refactor: make the command engine sprint-aware"
```

---

## Phase 3 — Navigation and the hub

### Task 7: Sprints hub and sprint card

**Files:**
- Create: `src/views/Sprints.tsx`, `src/components/SprintCard.tsx`
- Modify: `src/views/TopicsView.tsx`

**Interfaces:**
- Produces: `<Sprints state onOpen />`, `<SprintCard def stat joined onOpen onJoin onLeave />`
- `TopicsView` prop `scope: TopicType` becomes `sprintId: string`

- [ ] **Step 1: Build the sprint card**

Create `src/components/SprintCard.tsx`:

```tsx
import type { Stat } from '../types';
import type { SprintDef, TeaserDef } from '../data/sprints';
import { Meter } from './hud';

interface Props {
  def: SprintDef;
  stat: Stat;
  joined: boolean;
  onOpen: (id: string) => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
}

export function SprintCard({ def, stat, joined, onOpen, onJoin, onLeave }: Props) {
  return (
    <article className="sprint-card" style={{ ['--sprint' as string]: def.accent }}>
      <header className="sprint-card-h">
        <span className="sprint-ico" aria-hidden="true">{def.icon}</span>
        <span className="sprint-id">
          <b>{def.name}</b>
          <small>{def.tagline}</small>
        </span>
        {joined ? <span className="sprint-live">active</span> : null}
      </header>

      <div className="sprint-num">
        <b>{stat.pct}%</b>
        <span>{stat.done} of {stat.total} cleared</span>
      </div>
      <Meter p={stat.pct} cls="sprint" />

      <dl className="sprint-break">
        <div><dt>Active</dt><dd>{stat.prog}</dd></div>
        <div><dt>To revise</dt><dd>{stat.rev}</dd></div>
        <div><dt>Untouched</dt><dd>{stat.todo}</dd></div>
      </dl>

      <footer className="sprint-card-f">
        {joined ? (
          <>
            <button className="btn primary" onClick={() => onOpen(def.id)}>Open</button>
            <button className="btn ghost" onClick={() => onLeave(def.id)}>Leave</button>
          </>
        ) : (
          <button className="btn primary" onClick={() => onJoin(def.id)}>Join sprint</button>
        )}
      </footer>
    </article>
  );
}

export function TeaserCard({ def, onNudge }: { def: TeaserDef; onNudge: () => void }) {
  return (
    <button type="button" className="sprint-card is-locked" onClick={onNudge}>
      <header className="sprint-card-h">
        <span className="sprint-ico" aria-hidden="true">🔒</span>
        <span className="sprint-id">
          <b>{def.name}</b>
          <small>{def.blurb}</small>
        </span>
      </header>
      <span className="sprint-soon">coming soon</span>
    </button>
  );
}
```

- [ ] **Step 2: Build the hub**

Create `src/views/Sprints.tsx`:

```tsx
import type { TrackerState } from '../types';
import { TEASERS } from '../data/sprints';
import { statsForSprint } from '../lib/stats';
import { joinedSprintDefs, unjoinedSprintDefs } from '../lib/scope';
import { store } from '../lib/store';
import { toast } from '../lib/toasts';
import { SHead, Empty } from '../components/hud';
import { SprintCard, TeaserCard } from '../components/SprintCard';

export function Sprints({ state }: { state: TrackerState }) {
  const joined = joinedSprintDefs(state);
  const available = unjoinedSprintDefs(state);

  return (
    <section className="view">
      <SHead title="Interview sprints" sub="Pick what you are preparing for" />

      {joined.length ? (
        <div className="sprint-grid">
          {joined.map((def) => (
            <SprintCard
              key={def.id}
              def={def}
              stat={statsForSprint(state, def.id)}
              joined
              onOpen={(id) => store.openSprint(id)}
              onJoin={(id) => store.joinSprint(id)}
              onLeave={(id) => store.leaveSprint(id)}
            />
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            icon="◈"
            title="No sprint selected"
            msg="Join a sprint below to start tracking. Nothing is lost when you leave one later."
          />
        </div>
      )}

      <SHead title="Explore" sub="More tracks to add" />
      <div className="sprint-grid">
        {available.map((def) => (
          <SprintCard
            key={def.id}
            def={def}
            stat={statsForSprint(state, def.id)}
            joined={false}
            onOpen={(id) => store.openSprint(id)}
            onJoin={(id) => store.joinSprint(id)}
            onLeave={(id) => store.leaveSprint(id)}
          />
        ))}
        {TEASERS.map((def) => (
          <TeaserCard
            key={def.id}
            def={def}
            onNudge={() => toast(`${def.name} is not live yet — HLD and LLD are ready today`, '', 3200)}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Convert `TopicsView` to take a sprint id**

In `src/views/TopicsView.tsx`:

- Change the prop `scope: TopicType` to `sprintId: string` and update the destructure.
- Replace the imports: drop `CATS` / `TYPES`, add `import { SPRINT_IDS, categoriesOf, getSprint } from '../data/sprints';`.
- Replace `const accent = scope === 'LLD' ? 'lld' : 'hld';` with:

```tsx
  const def = getSprint(sprintId);
  const accent = 'sprint';
```

- Replace `allCategories` entirely:

```ts
function allCategories(state: TrackerState, sprintFilter: string | 'all'): string[] {
  const set: string[] = [];
  for (const id of sprintFilter === 'all' ? SPRINT_IDS : [sprintFilter]) {
    for (const c of categoriesOf(id)) if (!set.includes(c)) set.push(c);
  }
  for (const t of state.topics) {
    if (sprintFilter !== 'all' && t.sprint !== sprintFilter) continue;
    if (!set.includes(t.category)) set.push(t.category);
  }
  return set;
}
```

- Replace every `f.type` with `f.sprint` and every `t.type === scope` with `t.sprint === sprintId`.
- `skillTree(state, scope)` → `skillTree(state, sprintId)`.
- `CATS[scope]` in the bulk-move select → `categoriesOf(sprintId)`.
- `store.bulkMove(pickedIds, scope, …)` → `store.bulkMove(pickedIds, sprintId, …)`.
- Tile labels: `` `${def?.short ?? ''} mastery` `` and `icon={def?.icon}`; the count note becomes `` `${list.length} shown · ${scoped.length} in ${def?.short}` ``.
- Wrap the returned `<section className="view">` with the accent: `<section className="view" style={{ ['--sprint' as string]: def?.accent ?? 'var(--hld)' }}>`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck` → PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add the sprints hub and convert TopicsView to sprint ids"
```

### Task 8: Navigation, routing, console API

**Files:**
- Modify: `src/components/Sidebar.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `Sprints` (Task 7), `joinedSprintDefs` (Task 4), `store.openSprint` (Task 5)
- Produces: `navItems(state, stats, unlocked, dueCount): NavItem[]` with `NavItem.sprintId?: string`

- [ ] **Step 1: Rebuild `navItems` with dynamic sprint rows**

In `src/components/Sidebar.tsx`:

```tsx
export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  badge?: string;
  hot?: boolean;
  /** set on dynamic sprint rows */
  sprintId?: string;
}

export function navItems(state: TrackerState, stats: Stats, unlocked: number, dueCount: number): NavItem[] {
  const openQuests = state.today.items.filter((i) => !i.done).length;
  const sprintRows: NavItem[] = joinedSprintDefs(state).map((s) => ({
    id: 'sprint',
    sprintId: s.id,
    label: s.short,
    icon: s.icon,
    badge: `${stats.bySprint[s.id]?.pct ?? 0}%`,
  }));

  return [
    { id: 'dashboard', label: 'Base', icon: '◧' },
    { id: 'sprints', label: 'Sprints', icon: '◈' },
    ...sprintRows,
    { id: 'today', label: 'Quests', icon: '⚔', badge: String(openQuests), hot: openQuests > 0 },
    { id: 'revision', label: 'Review', icon: '↻', badge: String(dueCount), hot: dueCount > 0 },
    { id: 'calendar', label: 'Calendar', icon: '▦' },
    { id: 'awards', label: 'Awards', icon: '🏆', badge: String(unlocked) },
    { id: 'guide', label: 'Guide', icon: '?' },
  ];
}
```

Add `import { joinedSprintDefs } from '../lib/scope';`.

- [ ] **Step 2: Route sprint rows correctly**

In the `Sidebar` nav map, key on the sprint id and mark the active row:

```tsx
        {items.map((it) => {
          const current = it.sprintId
            ? view === 'sprint' && state.ui.activeSprint === it.sprintId
            : view === it.id;
          return (
            <button
              key={it.sprintId ?? it.id}
              className={`side-link ${it.sprintId ? 'is-sprint' : ''}`}
              aria-current={current ? 'page' : undefined}
              title={collapsed ? it.label : undefined}
              onClick={() => (it.sprintId ? store.openSprint(it.sprintId) : onNavigate(it.id))}
            >
              …unchanged inner markup
            </button>
          );
        })}
```

- [ ] **Step 3: Rebuild the mobile bar with five real destinations**

Replace `MobileNav`'s `primary` filter and drop the More button:

```tsx
  const wanted: ViewId[] = ['dashboard', 'sprints', 'today', 'revision', 'calendar'];
  const primary = wanted
    .map((id) => items.find((i) => i.id === id && !i.sprintId))
    .filter((i): i is NavItem => Boolean(i));
```

Remove the trailing `<button className="mnav-b" onClick={onMore}…>` block and the now-unused `onMore` prop, then delete `onMore={() => setMobileNavOpen(true)}` from `App.tsx`. The topbar `☰` already opens the drawer.

- [ ] **Step 4: Wire the new views in `App.tsx`**

Replace the two `TopicsView` lines in `<main>`:

```tsx
          {view === 'sprints' && <Sprints state={state} />}
          {view === 'sprint' && (
            <TopicsView
              sprintId={state.ui.activeSprint ?? 'hld'}
              state={state}
              onOpen={openDrawer}
              onEdit={openEdit}
            />
          )}
```

Add `import { Sprints } from './views/Sprints';`.

The `calendar` view is deliberately **not** wired here — `Calendar.tsx` does not exist until Task 12, and importing it now breaks the build. Task 12 Step 2 adds both the import and its render line. Until then the Calendar sidebar row renders an empty `<main>`, which is expected.

- [ ] **Step 5: Update the keyboard handler**

In the `onKey` effect, replace the `/` handler's view check and add sprint cycling:

```tsx
      if (e.key === '/') {
        e.preventDefault();
        if (view !== 'sprint') store.switchView('sprint');
        setTimeout(() => document.getElementById('fq')?.focus(), 40);
      } else if (e.key === '[' || e.key === ']') {
        const ids = state.joinedSprints;
        if (view !== 'sprint' || ids.length < 2) return;
        e.preventDefault();
        const i = ids.indexOf(state.ui.activeSprint ?? ids[0]);
        const next = e.key === ']' ? (i + 1) % ids.length : (i - 1 + ids.length) % ids.length;
        store.openSprint(ids[next]);
      } else if (e.key.toLowerCase() === 'n') {
```

Add `state.joinedSprints` and `state.ui.activeSprint` to that effect's dependency array.

- [ ] **Step 6: Extend the console API**

In the console-API effect, add:

```tsx
      sprints: () => ({
        registered: SPRINTS.map((s) => ({ id: s.id, name: s.name })),
        joined: store.getSnapshot().joinedSprints,
      }),
      join: (id: string) => store.joinSprint(id),
      leave: (id: string) => store.leaveSprint(id),
```

with `import { SPRINTS } from './data/sprints';`.

- [ ] **Step 7: Typecheck, build, and run V3**

Run: `npm run build` → PASS

`npm run dev`, then in the console record the before values:

```js
const before = { lv: tracker.level().level, xp: tracker.level().xp,
                 streak: tracker.streak(),
                 awards: tracker.awards().filter(a => a.unlocked).length };
tracker.leave('lld');
```

Confirm: the LLD row disappears from the sidebar; Quests suggestions contain no LLD topics; the Review count drops. Then:

```js
JSON.stringify(before) === JSON.stringify({ lv: tracker.level().level, xp: tracker.level().xp,
                 streak: tracker.streak(),
                 awards: tracker.awards().filter(a => a.unlocked).length })
// must be true — leaving must not cost XP, levels, streak or awards
tracker.join('lld');   // everything returns
```

Also confirm digits `1`–`7` reach Base, Sprints, Quests, Review, Calendar, Awards, Guide, and `[` / `]` cycle sprints.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: sprint-driven navigation, hub routing and console API"
```

### Task 9: Dashboard — mission vs lifetime

**Files:**
- Modify: `src/views/Dashboard.tsx`

- [ ] **Step 1: Split the two progress numbers**

Read `src/views/Dashboard.tsx` in full first. Replace the hardcoded HLD/LLD tiles with a row generated from `joinedSprintDefs(state)`, each using `statsForSprint(state, def.id)` and `style={{ ['--sprint']: def.accent }}`.

Label the two numbers so they cannot be confused — this is a spec requirement (§7), not decoration:

- Mission block heading: `Mission — {joined.map(s => s.short).join(' + ')}`, with a sub of `across your joined sprints`.
- Progression block heading: `Lifetime`, with a sub of `every sprint you have ever touched`.

- [ ] **Step 2: Handle the no-sprints-joined case**

When `state.joinedSprints.length === 0`, render in place of the mission block:

```tsx
        <div className="panel">
          <Empty
            icon="◈"
            title="No sprint selected"
            msg="Head to Sprints and join one to see your mission progress here."
          />
        </div>
```

- [ ] **Step 3: Keep the heatmap**

Leave `<Heatmap state={state} />` on the Dashboard unchanged — the Calendar is a drill-down, not a replacement.

- [ ] **Step 4: Typecheck and verify**

Run: `npm run typecheck` → PASS. Open the Dashboard and confirm both numbers render with distinct labels, then leave a sprint and confirm the mission % changes while the lifetime block does not.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: split dashboard into mission and lifetime progress"
```

### Task 10: Remove the transitional shims

**Files:**
- Modify: `src/types.ts`, `src/lib/model.ts`, `src/components/TopicModal.tsx`
- Delete: `src/data/seed.ts`

- [ ] **Step 1: Find every remaining consumer**

Run: `grep -rn "TopicType\|data/seed\|\.type\b\|filters\.type" src/`
Expected: only `TopicModal.tsx`, `types.ts`, `model.ts` remain. Migrate any other hit found.

- [ ] **Step 2: Convert `TopicModal` to sprints**

In `src/components/TopicModal.tsx` replace the seed/types imports with `import { SPRINTS, categoriesOf, getSprint } from '../data/sprints';`, then:

```tsx
  const [sprint, setSprint] = useState<string>(editing?.sprint ?? SPRINTS[0].id);
  const [category, setCategory] = useState(editing?.category ?? SPRINTS[0].categories[0].name);

  const cats = [
    ...categoriesOf(sprint),
    ...state.topics.filter((x) => x.sprint === sprint && !categoriesOf(sprint).includes(x.category)).map((x) => x.category),
  ].filter((v, i, a) => a.indexOf(v) === i);

  function pickSprint(next: string) {
    setSprint(next);
    if (!categoriesOf(next).includes(category)) setCategory(categoriesOf(next)[0]);
  }
```

Change the segmented control's label from `Type` to `Sprint` and its body to:

```tsx
              {SPRINTS.map((s) => (
                <button key={s.id} type="button" aria-pressed={s.id === sprint} onClick={() => pickSprint(s.id)}>
                  {s.short}
                </button>
              ))}
```

and put `sprint,` in place of `type,` in the `patch` object.

- [ ] **Step 3: Drop the deprecated fields**

In `src/types.ts` delete the `TopicType` alias, the `type?: string` field on `Topic`, and the `type: TopicType | 'all'` field on `Filters`.

In `src/lib/model.ts` remove `type: def.short,` from the object returned by `makeTopic` and delete the now-unused `SPRINTS` import if it is no longer referenced. **Leave the legacy read `o.sprint ?? o.type` in place** — old backups still carry `type` and must keep importing.

- [ ] **Step 4: Delete the shim**

```bash
rm src/data/seed.ts
```

- [ ] **Step 5: Build and re-run V1 against the original backup**

Run: `npm run build` → PASS

Import the backup exported in Task 1 Step 1 through the app's Import button and confirm topic count, statuses, level, streak and awards are all correct — this proves a pre-sprint backup still restores after the shim is gone.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: remove TopicType and the seed shim"
```

---

## Phase 4 — Calendar

### Task 11: Calendar derivation

**Files:**
- Create: `src/lib/calendar.ts`

**Interfaces:**
- Produces: `DayCell`, `DayDetail`, `monthGrid(state, year, month): DayCell[]`, `dayDetail(state, date): DayDetail`, `monthConsistency(state, year, month): number | null`, `monthLabel(year, month): string`

- [ ] **Step 1: Write the module**

Create `src/lib/calendar.ts`:

```ts
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
  /** part of the streak run ending today */
  inStreak: boolean;
}

export interface DayDetail {
  date: string;
  completed: Topic[];
  revised: Topic[];
  due: Topic[];
  /** completions history recorded that the topic list cannot name — see spec §8.3 */
  unaccounted: number;
}

/** local-midnight ISO for a Y/M/D, avoiding UTC drift from new Date(y, m, d).toISOString() */
function iso(year: number, month: number, day: number): string {
  return todayISO(new Date(year, month, day));
}

/** days in the current streak run, as a Set for O(1) cell lookup */
function streakDays(state: TrackerState): Set<string> {
  const active = new Set(Object.keys(state.history).filter((k) => state.history[k] > 0));
  const out = new Set<string>();
  let cur = new Date();
  if (!active.has(todayISO(cur))) cur = new Date(Date.now() - 864e5);
  while (active.has(todayISO(cur))) {
    out.add(todayISO(cur));
    cur = new Date(cur.getTime() - 864e5);
  }
  return out;
}

/**
 * Six-week grid covering `month`, Sunday-first, including the leading and
 * trailing days of adjacent months so every row is full.
 *
 * `month` is 0-indexed, matching the Date constructor.
 */
export function monthGrid(state: TrackerState, year: number, month: number): DayCell[] {
  const today = todayISO();
  const streak = streakDays(state);

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
  const start = new Date(year, month, 1 - first.getDay()); // back to Sunday
  const cells: DayCell[] = [];

  for (let i = 0; i < 42; i++) {
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
      inStreak: streak.has(key),
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
  if (new Date(year, month, 1) > now && !isCurrent) return null;

  const elapsed = isCurrent ? now.getDate() : new Date(year, month + 1, 0).getDate();
  let active = 0;
  for (let d = 1; d <= elapsed; d++) if ((state.history[iso(year, month, d)] ?? 0) > 0) active++;
  return Math.round((active / elapsed) * 100);
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → PASS

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add calendar derivation"
```

### Task 12: Calendar view

**Files:**
- Create: `src/views/Calendar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build the view**

Create `src/views/Calendar.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { TrackerState } from '../types';
import { dayDetail, monthConsistency, monthGrid, monthLabel } from '../lib/calendar';
import { completionStreak } from '../lib/stats';
import { longestStreak } from '../lib/game';
import { todayISO } from '../lib/utils';
import { SHead, Tile } from '../components/hud';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({ state, onOpen }: { state: TrackerState; onOpen: (id: string) => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [picked, setPicked] = useState<string | null>(todayISO());

  const cells = useMemo(() => monthGrid(state, year, month), [state, year, month]);
  const detail = useMemo(() => (picked ? dayDetail(state, picked) : null), [state, picked]);
  const streak = completionStreak(state);
  const best = Math.max(streak, longestStreak(state));
  const consistency = monthConsistency(state, year, month);

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setPicked(todayISO());
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(input|textarea|select)$/i.test(el.tagName)) return;
      if (document.querySelector('.ovl, .drawer-ovl')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); shift(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); shift(1); }
      else if (e.key.toLowerCase() === 't') { e.preventDefault(); goToday(); }
      else if (e.key === 'Escape') setPicked(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [year, month]);

  return (
    <section className="view">
      <div className="bento">
        <div className="c4"><Tile k="Current streak" v={`${streak}d`} m="days in a row" cls="fire" icon="🔥" /></div>
        <div className="c4"><Tile k="Best streak" v={`${best}d`} m="all time" cls="xp" icon="⚡" /></div>
        <div className="c4">
          <Tile
            k="Consistency"
            v={consistency == null ? '—' : `${consistency}%`}
            m={consistency == null ? 'future month' : 'of days this month'}
            cls="ok"
            p={consistency ?? 0}
            icon="▦"
          />
        </div>
      </div>

      <div className="panel pad">
        <SHead
          title={monthLabel(year, month)}
          sub="← → change month · T today"
          right={
            <span className="row">
              <button className="btn xs ghost" aria-label="Previous month" onClick={() => shift(-1)}>◀</button>
              <button className="btn xs ghost" onClick={goToday}>Today</button>
              <button className="btn xs ghost" aria-label="Next month" onClick={() => shift(1)}>▶</button>
            </span>
          }
        />

        <div className="cal-dow" aria-hidden="true">
          {DOW.map((d) => <span key={d}>{d}</span>)}
        </div>

        <div className="cal-grid" role="grid" aria-label={monthLabel(year, month)}>
          {cells.map((c) => (
            <button
              key={c.date}
              type="button"
              role="gridcell"
              className={`cal-c ${c.inMonth ? '' : 'out'} ${c.inStreak ? 'streak' : ''} ${picked === c.date ? 'sel' : ''}`}
              data-l={c.level}
              data-today={c.isToday ? 1 : 0}
              aria-label={`${c.date}: ${c.completions} completed${c.dueReviews ? `, ${c.dueReviews} due` : ''}`}
              onClick={() => setPicked(c.date)}
            >
              <span className="cal-n">{Number(c.date.slice(8))}</span>
              {c.isFuture && c.dueReviews ? <span className="cal-due">◷{c.dueReviews}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {detail ? (
        <div className="panel pad">
          <SHead title={detail.date} sub={`${detail.completed.length} completed · ${detail.revised.length} revised`} />
          {!detail.completed.length && !detail.revised.length && !detail.due.length ? (
            <p className="muted">Nothing logged or scheduled for this day.</p>
          ) : null}
          <div className="cal-list">
            {detail.completed.map((t) => (
              <button key={`c${t.id}`} className="cal-item" onClick={() => onOpen(t.id)}>
                <span className="ok" aria-hidden="true">✓</span> {t.name}
              </button>
            ))}
            {detail.revised.map((t) => (
              <button key={`r${t.id}`} className="cal-item" onClick={() => onOpen(t.id)}>
                <span aria-hidden="true">↻</span> {t.name}
              </button>
            ))}
            {detail.due.map((t) => (
              <button key={`d${t.id}`} className="cal-item" onClick={() => onOpen(t.id)}>
                <span aria-hidden="true">◷</span> {t.name} <em className="muted">due</em>
              </button>
            ))}
          </div>
          {detail.unaccounted > 0 ? (
            <p className="muted">+{detail.unaccounted} more completed this day (since re-completed elsewhere)</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Mount it**

In `src/App.tsx` add the import:

```tsx
import { Calendar } from './views/Calendar';
```

and add the render line inside `<main>`, directly after the `{view === 'sprint' && …}` block:

```tsx
          {view === 'calendar' && <Calendar state={state} onOpen={openDrawer} />}
```

- [ ] **Step 3: Build and run V2**

Run: `npm run build` → PASS

`npm run dev`, open Calendar and check each of:

- A month starting Sunday (e.g. Feb 2026) and one starting Saturday (e.g. Aug 2026) both render 6 full rows with correct alignment.
- February 2024 shows 29 days.
- A month spanning a DST change (Mar and Nov in your locale) has no duplicated or skipped date.
- Future days show `◷` pips. Then in the console run `tracker.topics().filter(t => t.srDue).length` — if 0, the pips prove the legacy `dueDate()` fallback works.
- Click a past day with completions and confirm the topics listed match; confirm `+N more` appears only when the count genuinely exceeds the named topics.
- `←` `→` `T` and `Esc` behave.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add the calendar view"
```

---

## Phase 5 — Styles

### Task 13: Split `styles.css`

A pure move. **No rule is rewritten in this task** — that is Task 14, kept separate so a visual regression here is obviously a move error.

**Files:**
- Create: `src/styles/tokens.css`, `base.css`, `layout.css`, `components.css`, `views.css`
- Modify: `src/main.tsx`
- Delete: `src/styles.css`

- [ ] **Step 1: Split by section**

Move rules from `src/styles.css` into the five files, cutting on the existing comment banners:

- `tokens.css` — the `:root`, `html[data-theme="dark"]`, `html[data-theme="light"]` blocks
- `base.css` — `*`, `html`, `body`, `button/input/select/textarea`, `a`, `::selection`, `:focus-visible`, `.mono`, `.muted`
- `layout.css` — `.shell`, `.side*`, `.main-col`, `.topbar`, `.mnav*`, `.mdrawer*`, `.bento`, `.c3/.c4/.c8`, all media queries governing layout
- `components.css` — `.btn`, `.panel`, `.tile`, `.meter`, `.badge`, `.toolbar`, `.modal`, `.ovl`, `.drawer*`, `.toast*`, `.pal*`, `.bulk`, `.empty`, `.ring`
- `views.css` — `.hud*`, `.heat*`, `.tree`, `.node*`, `.ach*`, `.unlock`, `.cat-block`, `.tlist`, `.quest*`, everything view-specific

Every rule must land in exactly one file. Nothing is deleted.

- [ ] **Step 2: Import in order**

In `src/main.tsx` replace `import './styles.css';` with:

```ts
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/views.css';
```

Order matters — tokens must be defined before any file consumes them.

- [ ] **Step 3: Delete the original and verify nothing moved visually**

```bash
rm src/styles.css
npm run build
```

Open every view in both themes and compare against the pre-split app. Any visual difference is a rule that was dropped or duplicated — find it before continuing.

- [ ] **Step 4: Check the line ceiling**

Run: `wc -l src/styles/*.css`
Expected: every file under 800. If `views.css` is over, split the calendar and sprint rules into `src/styles/views-calendar.css` and import it after.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: split styles.css by responsibility"
```

### Task 14: Visual refresh

**Files:**
- Modify: `src/styles/tokens.css`, `components.css`, `views.css`, `layout.css`

- [ ] **Step 1: Add the new tokens**

Append to the `:root` block in `src/styles/tokens.css`:

```css
  /* radius scale — replaces most bevel clip-paths */
  --r-sm:8px; --r-md:12px; --r-lg:18px; --r-xl:26px;

  /* display type — big confident numerals, mono demoted to labels */
  --fs-display:clamp(2.1rem,1.2rem+3.4vw,3.6rem);
  --fs-num:clamp(1.5rem,1rem+1.8vw,2.4rem);

  /* motion */
  --ease-spring:cubic-bezier(.22,1.4,.36,1);
  --ease-out:cubic-bezier(.16,1,.3,1);
  --dur-fast:140ms; --dur:260ms;

  /* per-sprint accent — set inline from SprintDef.accent; falls back to HLD cyan */
  --sprint:var(--hld);
```

Lower the glow in both theme blocks: dark `--glow:.34;` (from `.55`), light `--glow:.14;` (from `.20`).

- [ ] **Step 2: Add the sprint accent utilities**

Append to `src/styles/components.css`:

```css
.meter.sprint > i{background:linear-gradient(90deg,var(--sprint),color-mix(in srgb,var(--sprint) 55%,var(--xp)))}
.panel.rail.sprint{--rail:var(--sprint)}
.tile.sprint .stat-v{color:var(--sprint)}
```

- [ ] **Step 3: Soften the surfaces**

In `components.css`, replace the bevel `clip-path` on `.panel` and `.tile` with `border-radius:var(--r-lg)`. Keep the bevel on `.hud`, `.hud-badge` and `.ach` so the arcade identity survives. Raise `.btn` to `border-radius:var(--r-sm)` and `.modal` to `var(--r-xl)`.

- [ ] **Step 4: Style the new surfaces**

Append to `src/styles/views.css`:

```css
/* ---- sprints hub ---- */
.sprint-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin-bottom:22px}
.sprint-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:18px;display:flex;flex-direction:column;gap:12px;position:relative;
  transition:transform var(--dur) var(--ease-spring),border-color var(--dur) var(--ease-out)}
.sprint-card::before{content:"";position:absolute;inset:0 auto 0 0;width:3px;
  border-radius:var(--r-lg) 0 0 var(--r-lg);background:var(--sprint)}
.sprint-card:hover{transform:translateY(-3px);border-color:var(--sprint)}
.sprint-card-h{display:flex;gap:11px;align-items:flex-start}
.sprint-ico{font-size:22px;line-height:1}
.sprint-id b{display:block;font-size:var(--fs-lg)}
.sprint-id small{color:var(--tx-2);font-size:var(--fs-xs)}
.sprint-live{margin-left:auto;font-family:var(--mono);font-size:var(--fs-xs);
  color:var(--sprint);text-transform:uppercase;letter-spacing:.6px}
.sprint-num{display:flex;align-items:baseline;gap:9px}
.sprint-num b{font-size:var(--fs-num);font-weight:800;letter-spacing:-.02em;color:var(--sprint)}
.sprint-num span{color:var(--tx-2);font-size:var(--fs-sm)}
.sprint-break{display:flex;gap:16px;margin:0}
.sprint-break dt{font-size:var(--fs-xs);color:var(--tx-3);text-transform:uppercase;letter-spacing:.5px}
.sprint-break dd{margin:0;font-family:var(--mono);font-size:var(--fs-md);font-weight:700}
.sprint-card-f{display:flex;gap:8px;margin-top:auto}
.sprint-card.is-locked{opacity:.6;cursor:pointer;text-align:left;font:inherit;color:inherit;align-items:flex-start}
.sprint-card.is-locked::before{background:var(--idle)}
.sprint-card.is-locked:hover{opacity:.82;transform:none;border-color:var(--line-2)}
.sprint-soon{font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3);
  text-transform:uppercase;letter-spacing:.7px}

/* ---- calendar ---- */
.cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px}
.cal-dow span{font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3);text-align:center}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.cal-c{position:relative;aspect-ratio:1;border:1px solid var(--line);border-radius:var(--r-sm);
  background:var(--track);color:var(--tx-2);font:inherit;cursor:pointer;padding:6px;
  display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;
  transition:transform var(--dur-fast) var(--ease-spring),border-color var(--dur-fast) var(--ease-out)}
.cal-c:hover{transform:scale(1.06);border-color:var(--sprint)}
.cal-c.out{opacity:.34}
.cal-c[data-l="1"]{background:color-mix(in srgb,var(--ok) 22%,var(--track))}
.cal-c[data-l="2"]{background:color-mix(in srgb,var(--ok) 40%,var(--track))}
.cal-c[data-l="3"]{background:color-mix(in srgb,var(--ok) 62%,var(--track))}
.cal-c[data-l="4"]{background:color-mix(in srgb,var(--ok) 84%,var(--track));color:var(--bg)}
.cal-c.streak{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--fire) 60%,transparent)}
.cal-c[data-today="1"]{border-color:var(--xp);box-shadow:0 0 0 2px color-mix(in srgb,var(--xp) 38%,transparent)}
.cal-c.sel{border-color:var(--sprint);box-shadow:0 0 0 2px color-mix(in srgb,var(--sprint) 45%,transparent)}
.cal-n{font-family:var(--mono);font-size:var(--fs-xs);font-weight:700}
.cal-due{font-family:var(--mono);font-size:10px;color:var(--warn)}
.cal-list{display:flex;flex-direction:column;gap:5px;margin-top:10px}
.cal-item{display:flex;gap:8px;align-items:center;background:var(--panel-2);border:1px solid var(--line);
  border-radius:var(--r-sm);padding:8px 11px;font:inherit;color:inherit;cursor:pointer;text-align:left;
  transition:border-color var(--dur-fast) var(--ease-out)}
.cal-item:hover{border-color:var(--sprint)}

@media (max-width:520px){
  .cal-c{padding:3px}
  .cal-due{display:none}
}
```

- [ ] **Step 5: Add motion, gated on reduced-motion**

Append to `src/styles/views.css`:

```css
@media (prefers-reduced-motion: no-preference){
  @keyframes pop{0%{transform:scale(1)}42%{transform:scale(1.14)}100%{transform:scale(1)}}
  @keyframes flame{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2px) scale(1.09)}}
  .vital.fire .v{animation:flame 2.4s var(--ease-out) infinite}
  .trow.just-done .status-dot{animation:pop 420ms var(--ease-spring)}
  .sprint-num b{transition:color var(--dur) var(--ease-out)}
}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.001ms !important;transition-duration:.001ms !important}
}
```

- [ ] **Step 6: Build and run V5**

Run: `npm run build` → PASS

Check every view — Dashboard, Sprints, a sprint's topics, Quests, Review, Calendar, Awards, Guide — in **both** themes at 375px, 768px and 1440px. Confirm no horizontal overflow, focus rings still visible, and the calendar grid stays square on mobile.

Run: `wc -l src/**/*.tsx src/**/*.ts src/styles/*.css | sort -n | tail -5`
Expected: nothing over 800 lines.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: gen-z visual refresh with per-sprint theming"
```

---

## Phase 6 — Documentation

### Task 15: Update the README and run V4

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite the affected sections**

`README.md` documents the old model in several places. Update:

- Title and intro — the app tracks *sprints*, of which HLD and LLD are the first two.
- **Interface** — replace the HLD/LLD description with the Sprints hub, dynamic sidebar rows, and the Calendar.
- **Catalogue** — describe the registry, and state plainly that **sprint ids are permanent because they are baked into every `sid`**.
- **Keyboard** — `1`–`7` now map to Base, Sprints, Quests, Review, Calendar, Awards, Guide; add `[` / `]`, and the Calendar's `←` `→` `T`.
- **Console API** — add `tracker.sprints()`, `tracker.join(id)`, `tracker.leave(id)`.
- **Source layout** — reflect `data/sprints/`, `lib/scope.ts`, `lib/calendar.ts`, `views/Sprints.tsx`, `views/Calendar.tsx`, `styles/`.
- Add an **Enrollment** section stating that leaving a sprint hides it from the sidebar, Quests and Review, and never changes XP, levels, awards or streak.
- Replace "To add topics permanently, edit `SEED` in `src/data/seed.ts`" with instructions for adding a sprint file plus a registry line.

- [ ] **Step 2: V4 — prove extensibility**

Create a scratch `src/data/sprints/scratch.ts`:

```ts
import type { SprintDef } from './types';

export const scratch: SprintDef = {
  id: 'scratch',
  name: 'Scratch Sprint',
  short: 'SCR',
  tagline: 'Temporary extensibility check',
  icon: '🧪',
  accent: '#ff7ae5',
  categories: [{ name: 'Scratch Basics', rank: 0, rows: [['Alpha', 'Easy'], ['Beta', 'Hard']] }],
};
```

Add `scratch` to the `SPRINTS` array in `index.ts`, run the app, and confirm all of: the card appears under Explore; joining adds a sidebar row; the card and its meter render in pink from `accent` with **no new CSS**; a `scratch-master` award appears in Awards; `tracker.stats().bySprint.scratch` exists.

- [ ] **Step 3: Remove the scratch sprint cleanly**

```bash
rm src/data/sprints/scratch.ts
```

Remove its import and registry entry. Reload and confirm: the app boots, and the two scratch topics no longer appear. In the console run `tracker.data().joinedSprints` — if `'scratch'` lingers it means the `getSprint` filter in `loadState` is not running; fix it, because it is the same code path that protects a user who downgrades.

- [ ] **Step 4: Final build and commit**

```bash
npm run build
git add -A && git commit -m "docs: document sprints, calendar and the extension path"
```

---

## Verification summary

Mapping spec §11 to where each check runs:

| Spec check | Runs in |
|---|---|
| V1 — data survival | Task 1 Step 13, re-run in Task 10 Step 5 |
| V2 — calendar | Task 12 Step 3 |
| V3 — enrollment scoping | Task 8 Step 7 |
| V4 — extensibility | Task 15 Steps 2–3 |
| V5 — build and layout | Task 14 Step 6 |

## Success criteria (spec §13)

1. Existing save opens unchanged — Task 1 Step 13, Task 10 Step 5
2. Leaving a sprint costs no XP/level/award/streak — Task 8 Step 7
3. Calendar shows past, streak run and scheduled reviews — Task 12 Step 3
4. A third sprint costs one file plus one registry line — Task 15 Step 2
5. `npm run build` passes, every `src/` file under 800 lines — Task 14 Step 6
6. Both themes complete on every view — Task 13 Step 3, Task 14 Step 6
