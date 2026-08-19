# Interview Sprints, Calendar & Visual Refresh — Design

**Date:** 2026-08-18
**Status:** Approved for planning
**Repo:** `/Users/apple/Projects-Hosted/Tracker` (HLD + LLD Tracker, v2.0.0)

---

## 1. Problem

The tracker models study material as a closed union — `TopicType = 'HLD' | 'LLD'` — baked into
`types.ts`, `seed.ts`, `model.ts`, `store.ts`, `stats.ts`, `game.ts`, `commands.ts` and five
components. Three consequences:

1. **No way to add a curriculum.** A Striver DSA sheet, a behavioural-interview track, or any
   future sheet requires widening the union and editing every one of those files.
2. **No way to opt in.** Every topic in the catalogue always counts toward Quests, the review
   queue and the dashboard. There is no notion of "I am working on LLD this month".
3. **Streaks are glanceable but not inspectable.** `game.ts` renders a 20-week heatmap; there is
   no month view, no day detail, and no forward view of scheduled reviews — despite the SRS
   scheduler already writing `srDue` dates the user cannot see on a calendar.

Alongside this, the visual language (neon arcade HUD, beveled clip-paths, dense 11px mono) reads
as dated, and `styles.css` is a single 834-line file that would cross 1,100 lines with two new
views — over the project's own 800-line ceiling.

## 2. Goals

- A **Sprint** concept: a named, self-contained curriculum the user explicitly joins or leaves.
- HLD and LLD become the first two sprints, with **zero loss of existing progress**.
- Adding a future sprint costs **one data file plus one registry line** — no union widening, no
  new CSS, no navigation code.
- A **Calendar** view showing past activity, streak runs, and reviews scheduled ahead.
- A **visual refresh** that modernises the existing arcade identity rather than replacing it.

## 3. Non-goals

Explicitly out of scope for this spec:

- Striver (or any third) sprint **content**. Architecture only, plus locked teaser cards.
- Drag-to-plan scheduling on the calendar. The SRS ladder and Quests remain the only schedulers.
- Cloud sync, accounts, or any backend. The app stays localStorage-only.
- Changes to the XP curve, level thresholds, or rank names.
- Automated tests. The project has no test runner and none is being added; verification is manual
  against the running app (see §11).

## 4. Decisions taken

| # | Decision | Rationale |
|---|---|---|
| D1 | Sprints **replace** HLD/LLD in the navigation | One door per destination; future sheets add no nav churn |
| D2 | Calendar shows **past and future** | `srDue` already exists; a backward-only calendar is half empty |
| D3 | Visual refresh **keeps the arcade bones** | Identity is an asset; a total restyle is a rewrite with no functional gain |
| D4 | Joining/leaving **scopes attention, never data** | Progression must never punish focus (see §7) |
| D5 | Ship **architecture + locked teaser cards**, no third sprint content | Extensibility proven by structure, not by a 450-row dataset |

---

## 5. Architecture

### 5.1 Chosen approach — sprint registry

Replace the closed `TopicType` union with an open registry of `SprintDef` records, one module per
sprint.

Two alternatives were rejected:

- **Sprint as a grouping of `(type, category)` pairs.** Keeps `TopicType` intact, so adding
  Striver still means widening a hardcoded union across eight files. Fails goal 3.
- **Sprint as a tag array (a topic belongs to many sprints).** Causes double-counting in
  aggregate stats, complicates `sid` derivation, and no current requirement needs it. YAGNI.

### 5.2 The property that makes this safe

`seedRows()` derives each stable seed id as:

```ts
sid = `${type}|${cat}|${name}`.toLowerCase().replace(/\s+/g, '-')
```

`loadState()` merges catalogue rows by matching on `sid`, and never overwrites a topic that
already exists. **If sprint ids are the lowercase strings `hld` and `lld`, every generated `sid`
is byte-identical to today's.** Therefore:

- Existing localStorage saves keep every status, note, date and revision count.
- Previously exported JSON backups import with full progress.
- `removedSeeds` entries still suppress the rows the user deleted.

This is the single most important invariant in the change. It is verified by hand before any UI
work begins: export a backup of the current state, land the registry and migration, reload, and
confirm topic count, statuses, notes, streak, level and awards are unchanged. The backup is the
restore path if they are not.

**Constraint that follows:** a sprint `id` is permanent. Renaming `hld` would orphan 54 topics.
This is documented in `SprintDef`'s doc comment and in the README.

### 5.3 File layout

```
src/data/sprints/
├── index.ts      SPRINTS registry, getSprint(id), allSeedRows(), TEASERS
├── hld.ts        SprintDef — the 54 HLD topics, moved verbatim
├── lld.ts        SprintDef — the 60 LLD topics, moved verbatim
└── teasers.ts    locked cards: id, name, blurb. No topics, no categories.
```

`src/data/seed.ts` is reduced to a compatibility shim re-exporting `CATS` and `seedRows()`
derived from the registry, so imports elsewhere keep resolving during the refactor. It is deleted
in the final step once no importer remains.

### 5.4 Types

```ts
/** A curriculum the user can join. `id` is permanent — it is baked into every sid. */
export interface SprintDef {
  id: string;            // 'hld' — never rename; see §5.2
  name: string;          // 'High Level Design'
  short: string;         // 'HLD' — sidebar and badges
  tagline: string;       // one line for the hub card
  icon: string;
  accent: string;        // CSS color; drives --sprint on the view wrapper
  categories: CategoryDef[];
}

export interface CategoryDef {
  name: string;
  /** ordering weight for suggestNext — replaces the hardcoded CAT_RANK map */
  rank: number;
  rows: SeedRow[];
}

/** A sprint with no content yet. Rendered locked on the hub. */
export interface TeaserDef {
  id: string;
  name: string;
  blurb: string;
  icon: string;
}
```

`TopicType` and the `TYPES` constant are deleted. `Topic.type` becomes `Topic.sprint: string`.

### 5.5 State shape

```ts
interface TrackerState {
  schema: number;          // SCHEMA bumps 1 → 2
  joinedSprints: string[]; // NEW
  …unchanged
}

interface Filters {
  sprint: string | 'all';  // was: type: TopicType | 'all'
  …unchanged
}

type ViewId =
  | 'dashboard' | 'sprints' | 'sprint' | 'today'
  | 'revision' | 'calendar' | 'awards' | 'guide';

interface UiState {
  activeSprint: string | null;  // NEW — which sprint the 'sprint' view renders
  …unchanged
}
```

`'hld'` and `'lld'` are removed from `ViewId`. A single `'sprint'` view renders whichever sprint
`ui.activeSprint` names, so the view count stays fixed as sprints multiply.

The storage `KEY` stays `hld-lld-tracker/v1`. Changing it would orphan every existing user.

---

## 6. Migration

All migration happens on read, in `model.ts`, alongside the tolerance logic that already exists
there for pre-SRS saves.

### 6.1 Topics

In `makeTopic`:

```ts
const sprint = resolveSprint(o.sprint ?? o.type);   // 'HLD' → 'hld'
```

`resolveSprint` lowercases its input and falls back to the first registered sprint id when the
value names no registered sprint. This covers old saves, old exported backups, command input, and
a save referencing a sprint whose data file was removed.

`o.type` is read but never written. `Topic.type` is dropped from the interface rather than kept as
a dead field.

### 6.2 Joined sprints

In `loadState`, when `saved.joinedSprints` is absent:

| Condition | Result | Why |
|---|---|---|
| `saved.topics.length > 0` | `['hld', 'lld']` | An existing user must notice nothing |
| No save, or empty topics | `[]` | A fresh user picks their own sprints |

When `joinedSprints` is empty **and** topics exist (the user left every sprint), the app still
boots normally — the sidebar shows no sprint rows and the Dashboard prompts a return to the hub.
When `joinedSprints` is empty on a genuinely fresh state, `ui.view` is initialised to `'sprints'`
so choosing is the first interaction. No onboarding modal.

Ids in `joinedSprints` that name no registered sprint are filtered out on load.

### 6.3 UI state

`ui.filters.type` → `ui.filters.sprint`, migrating `'HLD' → 'hld'`, `'LLD' → 'lld'`, `'all'`
unchanged. `ui.view` values `'hld'` / `'lld'` migrate to `view: 'sprint'` with the matching
`activeSprint`.

---

## 7. Enrollment semantics

Joining or leaving scopes **attention**, never data. One helper is the single source of truth:

```ts
/** topics belonging to a sprint the user has joined */
export function activeTopics(state: TrackerState): Topic[];
```

| Surface | Scoped to joined sprints? |
|---|---|
| Sidebar sprint rows | Yes |
| Quests / `suggestNext` | Yes |
| Review queue (`reviewBuckets`) | Yes — paused, not lost |
| Dashboard mission % | Yes |
| Topic search / ⌘K palette | No — you can always find anything |
| XP, level, rank | **No — lifetime, all sprints** |
| Awards | **No — lifetime, all sprints** |
| Streak, `history`, calendar heat | **No — lifetime, all sprints** |

Leaving a sprint therefore never costs a level or re-locks a badge. It is offered with a toast +
Undo, consistent with every other reversible action in the app. Nothing is deleted; rejoining
restores the sprint's rows to the sidebar and its reviews to the queue immediately.

A topic in a left sprint is still reachable through search and ⌘K, and completing it there behaves
exactly as normal: it earns XP, bumps `history`, extends the streak, and schedules its next review.
Leaving a sprint suppresses what the app *suggests*, never what the user *does*.

**Dashboard wording must distinguish the two numbers**, since both appear on one screen:

- "Mission" progress — completion across joined sprints. Labelled with the joined sprint names.
- "Lifetime" progression — level, XP, rank, awards, streak. Labelled *lifetime*.

---

## 8. Calendar

### 8.1 Logic — `src/lib/calendar.ts`

Pure functions, no React, no new stored state.

```ts
export interface DayCell {
  date: string;          // YYYY-MM-DD
  inMonth: boolean;      // false for leading/trailing days of adjacent months
  isToday: boolean;
  isFuture: boolean;
  completions: number;   // past: state.history[date]
  level: number;         // 0–4 intensity, same bucketing as the existing heatmap
  dueReviews: number;    // future: topics whose dueDate() lands on this day
  inStreak: boolean;     // part of the current streak run
}

export function monthGrid(state: TrackerState, year: number, month: number): DayCell[];

export interface DayDetail {
  date: string;
  completed: Topic[];    // dateCompleted === date
  revised: Topic[];      // lastRevisedAt === date
  due: Topic[];          // dueDate() === date
  unaccounted: number;   // history[date] - completed.length, floored at 0
}

export function dayDetail(state: TrackerState, date: string): DayDetail;
```

Grid weeks start Sunday, matching the existing heatmap's alignment.

### 8.2 Data sources

- **Past heat** comes from `state.history[date]`, which the store already maintains correctly
  through `bumpHistory`. The calendar introduces no second counter that could drift.
- **Future review pips** come from `srs.dueDate(topic)`, **not** from `topic.srDue` directly.
  `dueDate()` contains the lazy fallback that derives a due date for topics completed before the
  SRS feature existed, so legacy saves get a populated forward view rather than an empty one.
- **Streak numbers** reuse `completionStreak` and `longestStreak` from the existing modules. No
  new streak logic — two implementations could disagree.

### 8.3 Known limitation, handled honestly

`history` stores a *count* per day; a topic stores only its *latest* `dateCompleted` and
`lastRevisedAt`. A topic completed, reset, and re-completed is therefore reconstructable only on
the later date. When `history[date]` exceeds what the day panel can name, the panel renders
`+N more` via `DayDetail.unaccounted` rather than misrepresenting the day.

An append-only event log was considered and **rejected**: it would grow state without bound and
break the property the app is built on — that every derived number is recomputed from current
state, so an old backup gains levels and badges the moment it is imported.

### 8.4 View — `src/views/Calendar.tsx`

- Month header with current streak, longest streak, and consistency for the displayed month —
  active days ÷ elapsed days, where "elapsed" means days up to and including today for the current
  month, and the full month length for any past month. Future months show no consistency figure.
- Month grid. Past days render heat; today is ringed; future days render review pips. Days in the
  current streak run share a connected treatment.
- Selecting a day opens a detail panel listing completed, revised, and due topics, each opening
  the existing `TopicDrawer` on click.
- Keyboard: `←` / `→` change month, `T` returns to today, `Esc` clears the selected day.
- The 20-week heatmap **stays** on the Dashboard as the glanceable summary. The Calendar is the
  drill-down, not a replacement.

---

## 9. Navigation, hub, and visual refresh

### 9.1 Sidebar

```
◧ Base          1
◈ Sprints       2      ← the hub
── your sprints ──     dynamic: one row per joined sprint, [ and ] cycle
   🏗 HLD  62%
   🔬 LLD  31%
⚔ Quests        3
↻ Review        4
▦ Calendar      5
🏆 Awards       6
? Guide         7
```

Digits `1`–`7` map to the fixed rows only, so shortcuts stay stable as sprints are added or
removed. Sprint rows are reached by click, by `[` / `]` within a sprint view, or via ⌘K.

The level/XP/streak HUD stays at the top of the rail, unchanged in function.

### 9.2 Mobile

The bottom bar carries five real destinations — Base, Sprints, Quests, Review, Calendar — and
drops its "More" tab. The topbar already renders a `☰` that opens the full drawer, so the More tab
was a duplicate affordance.

### 9.3 Sprints hub — `src/views/Sprints.tsx`

- **Your sprints** — one card per joined sprint: name, tagline, progress ring, topic counts by
  status, next-up topic, and a Leave action.
- **Explore** — unjoined registered sprints (joinable), then locked teaser cards from
  `TEASERS`.
- Teaser cards are locked as decided (D5). Clicking one fires a toast — *"Not yet — HLD and LLD
  are live today"* — rather than swallowing the click silently, which reads as broken rather than
  as roadmap.

### 9.4 Visual refresh

`styles.css` splits into `src/styles/`, imported by `main.tsx` in this order:

```
tokens.css       palette, radii, type scale, easing, per-sprint accent contract
base.css         reset, body, focus, typography primitives
layout.css       shell, sidebar, topbar, mobile nav, drawers
components.css   buttons, rows, chips, modals, toasts, palette
views.css        dashboard, sprints, topics, quests, review, calendar, awards, guide
```

Changes, all within the existing dark/light token system:

- **Radius scale** (`--r-sm/md/lg/xl`) replaces most bevel clip-paths. A few bevels survive on the
  HUD and rank plate so the arcade identity does not evaporate.
- **Type** — a `clamp()` display scale. Large confident numerals for percentage, streak and level;
  mono demoted to labels and tabular data rather than body copy.
- **Restraint** — `--glow` reduced; accent colour reserved for progress and state. Neon becomes
  emphasis rather than wallpaper.
- **`--sprint` custom property**, set on the sprint view wrapper from `SprintDef.accent`, so a
  future sprint is themed by data with zero new CSS. The existing `--hld` / `--lld` tokens are
  retained only where they refer to fixed chrome.
- **Motion** — spring easing tokens; a pop on topic completion; a tick on the streak flame when it
  advances. All inside `@media (prefers-reduced-motion: no-preference)`.

Both themes are checked; light mode is not an afterthought.

---

## 10. Consequential rewiring

Beyond the two new views, the following change:

| File | Change |
|---|---|
| `types.ts` | `TopicType`/`TYPES` deleted; `Topic.sprint`; `Filters.sprint`; `ViewId`; `UiState.activeSprint`; `TrackerState.joinedSprints` |
| `model.ts` | `resolveSprint`; `joinedSprints` defaulting; `ui.filters` and `ui.view` migration |
| `storage.ts` | `SCHEMA` 1 → 2. `KEY` unchanged |
| `stats.ts` | `bySprint: Record<string, Stat>` replaces hardcoded `hld`/`lld` filters. `CAT_RANK` moves into `CategoryDef.rank`. `.hld` and `.lld` retained as derived aliases so the documented console API keeps working |
| `game.ts` | `hld-master`/`lld-master` become per-sprint awards generated from the registry; category awards read category names from the registry instead of hardcoded strings; `skillTree(state, sprintId)` reads its order from the sprint's categories |
| `srs.ts` | `reviewBuckets` takes an optional topic list so it can be scoped to `activeTopics` |
| `commands.ts` | `findCategory` searches all registered sprints; `add … to <cat>` and `move … to <cat>` resolve across sprints |
| `store.ts` | `joinSprint(id)` / `leaveSprint(id)`; `switchView` sets `activeSprint`; `moveTopic`/`bulkMove` take a sprint id; `produce` clones `joinedSprints` |
| `Sidebar.tsx` | dynamic sprint rows; `navItems` built from joined sprints |
| `TopicsView.tsx` | scoped by sprint id rather than `scope="HLD"` |
| `TopicModal.tsx` | sprint select replaces type select |
| `Dashboard.tsx` | mission vs lifetime split (§7); sprint cards |
| `Palette.tsx` | sprint-aware jump targets and commands |
| `App.tsx` | new views, `[`/`]` handling, console API additions |
| `README.md` | the type model is documented in four places; all updated |

Console API additions: `tracker.sprints()`, `tracker.join(id)`, `tracker.leave(id)`,
`tracker.calendar(year, month)`. Every command documented in the current README keeps working.

---

## 11. Verification

No test runner is added. Verification is manual against the running app, using the existing
`tracker.*` console API to inspect derived values directly. The checks below are run at the phase
boundaries they belong to, not batched at the end.

**V1 — data survival (run before any UI work).**
Export a backup via `tracker.export()`. Land the registry and migration. Reload and confirm:
`tracker.topics().length` unchanged; a spot-check of statuses, notes and `revisionCount` on
previously completed topics; `tracker.level()`, `tracker.streak()` and the unlocked count from
`tracker.awards()` all unchanged; deleted catalogue rows have not reappeared. Import the backup if
anything differs.

**V2 — calendar.**
Check a month starting Sunday and one starting Saturday, February in a leap year, and a month
spanning a DST transition — day counts and alignment must be right in each. Confirm future review
pips appear for a save with no `srDue` values (the legacy `dueDate()` fallback), and that the day
panel's `+N more` appears only when `history[date]` genuinely exceeds the named topics.

**V3 — enrollment scoping.**
Leave a sprint. Confirm it vanishes from sidebar, Quests and Review, while `tracker.level()`,
`tracker.awards()` and `tracker.streak()` return identical values before and after. Rejoin and
confirm full restoration.

**V4 — extensibility.**
Add a scratch third sprint file with two topics, confirm it appears on the hub, joins, themes from
its own accent, and generates its own master award — then delete the file and confirm a clean
reload. This proves success criterion 4 without shipping content.

**V5 — build and layout.**
`npm run build` passes. Every file under `src/` is under 800 lines. All views checked in both dark
and light themes at 375px, 768px and 1440px.

> **Noted risk:** the migration in §6 and the date arithmetic in §8.1 are the two places where a
> silent, hard-to-notice defect is most likely, and they are the two places automated tests would
> have paid for themselves. V1 and V2 are the substitute; V1's backup-first ordering is what makes
> a migration mistake recoverable rather than permanent.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Change touches nearly every file in `src/` | Build the registry + migration first and run V1 before touching UI. The `seed.ts` shim keeps the tree compiling mid-refactor |
| A user's progress is lost on upgrade | The `sid` stability property (§5.2); `KEY` and `sid` derivation both unchanged; V1 run against a real backup before the refactor spreads |
| A migration or date-math defect ships unnoticed | No automated tests by decision; V1 and V2 (§11) are the manual substitute, and V1 takes a backup first so the failure mode is recoverable |
| Two streak numbers disagree | Calendar reuses `completionStreak` / `longestStreak`; no reimplementation |
| Mission % vs lifetime XP confuses on one screen | Explicit labelling required by §7; both numbers named, not just shown |
| CSS split introduces regressions | Split is mechanical (move, don't rewrite), done as its own step before restyling begins |
| Locked teasers read as broken | Click fires an explanatory toast (§9.3) |

---

## 13. Success criteria

1. An existing save opens after the upgrade with identical topics, statuses, notes, streak, level
   and awards — verified by V1 against a real backup.
2. Leaving a sprint removes it from the sidebar, Quests and Review, and changes no XP, level,
   award or streak number.
3. The Calendar shows past completions, the current streak run, and reviews scheduled ahead,
   including for a save created before the SRS feature existed.
4. Adding a hypothetical third sprint requires only a new file in `src/data/sprints/` and one
   registry line — demonstrated by the scratch sprint in V4.
5. `npm run build` passes; every file under `src/` is under 800 lines.
6. Both dark and light themes are visually complete across all views.
