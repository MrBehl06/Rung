# Minimal Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the tracker to five destinations — Base, Calendar, Sprints, Review, Rewards — gut the dashboard to a level plus a next action, and replace the Quests board with writable day notes on the Calendar.

**Architecture:** Removal-first. Phase 1 deletes three views and their supporting state (`today`, `seenAchievements`) plus every streak and achievement code path, leaving the app running on a reduced surface. Phase 2 restructures navigation around a collapsible Sprints group. Phases 3 and 4 rebuild the Base page and add the `dayNotes` editor — independent of each other, parallelisable. Phase 5 is a visual pass.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7. No runtime dependencies beyond `react` / `react-dom`. localStorage only.

**Spec:** `docs/superpowers/specs/2026-08-22-minimal-tracker-design.md`

## Global Constraints

- **No automated tests.** No test runner, no test files, no test dependency. Verification is manual per spec §13 (V1–V5). Every task closes with `npm run build` plus targeted manual checks.
- **`KEY` in `src/lib/storage.ts` stays `'hld-lld-tracker/v1'`.** Changing it orphans every existing user.
- **`SCHEMA` goes 2 → 3.** Storage key unchanged.
- **`sid` derivation must not change:** `` `${sprintId}|${cat}|${name}`.toLowerCase().replace(/\s+/g,'-') ``.
- **Never compute XP or levels from anything but completions and revisions.** `totalXp` sums completed-topic XP plus `revisionCount × 15` and nothing else — this is why Quests can be deleted (spec §4.1).
- **`history` and `bumpHistory` are kept**, even though no streak is displayed; they shade calendar days.
- **Topic notes and day notes never write to each other** (spec §4.2).
- **No mutation.** `store.produce` clones before mutating a draft.
- **Every file under `src/` stays below 800 lines.** Explicit types on exports, no `any`, no leftover `console.log`.
- Both `dark` and `light` themes must be complete for every surface touched.
- `npm run build` (`tsc --noEmit && vite build`) must pass at the end of every task.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/lib/daynotes.ts` | `parseNote`, `remapChecked`, `toggleLine` — pure, no React |
| `src/views/Rewards.tsx` | Single coming-soon panel |
| `src/components/DayNote.tsx` | The day-note editor: read mode, edit mode, checkboxes |
| `src/components/NavGroup.tsx` | Collapsible sidebar group used by the Sprints row |

**Deleted:**

| Path | Phase |
|---|---|
| `src/views/Today.tsx` | 1 |
| `src/views/Awards.tsx` | 1 |
| `src/views/Guide.tsx` | 1 |

**Modified:** `src/types.ts`, `src/lib/model.ts`, `src/lib/storage.ts`, `src/lib/store.ts`, `src/lib/game.ts`, `src/lib/stats.ts`, `src/lib/commands.ts`, `src/components/hud.tsx`, `src/components/Sidebar.tsx`, `src/components/Palette.tsx`, `src/views/Dashboard.tsx`, `src/views/Calendar.tsx`, `src/App.tsx`, `src/styles/*.css`, `README.md`

---

# PHASE 1 — STRIP

Removes Quests, Awards, Guide, streaks and dashboard furniture. The app runs at the end of this phase on a reduced nav; it is not yet pretty.

### Task 1: Remove the Quests board

**Files:**
- Delete: `src/views/Today.tsx`
- Modify: `src/types.ts`, `src/lib/store.ts`, `src/lib/game.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/Palette.tsx`, `src/lib/commands.ts`

**Interfaces:**
- Produces: `TrackerState` without `today`; `ViewId` without `'today'`

- [ ] **Step 1: Confirm removing Quests cannot cost XP**

Run: `grep -n "QUEST_BONUS" src/lib/game.ts`

Read `totalXp` and confirm with your own eyes that `QUEST_BONUS` appears only in its own
declaration and in `questState` — never inside `totalXp`. If it *is* summed into `totalXp`, STOP
and report: the spec's §4.1 premise is wrong and deleting Quests would drop the user's level.

- [ ] **Step 2: Record the level before the change**

Run `npm run dev`, open the app, and in the browser console:

```js
JSON.stringify(tracker.level())
```

Keep this string. Step 9 compares against it.

- [ ] **Step 3: Delete the view and its type**

```bash
rm src/views/Today.tsx
```

In `src/types.ts`, delete the entire `TodayItem` interface and remove the `today` field from
`TrackerState`:

```ts
  /** 'YYYY-MM-DD' -> completions that day */
  history: Record<string, number>;
```

(the `today: { date: string; items: TodayItem[] };` line directly above `history` goes).

Remove `'today'` from the `ViewId` union and from the `VIEWS` array.

- [ ] **Step 4: Strip the store**

In `src/lib/store.ts` delete, in order:

- `export const MAX_TODAY = 5;`
- the `this.rollTodayIfNeeded();` call in the constructor
- the whole `// ---------- today's focus ----------` section: `rollTodayIfNeeded`, `addToday`,
  `toggleTodayDone`, `removeToday`, `carryToTomorrow`, `clearTodayDone`
- in `produce`, the line `today: { ...this.state.today, items: this.state.today.items.map((i) => ({ ...i })) },`
- in `setStatus`, the block that keeps Today in step:

```ts
      // keep Today's list in step
      d.today.items.forEach((it) => {
        if (it.topicId === id) it.done = status === 'Completed';
      });
```

- the identical `d.today.items.forEach(...)` block in `review`
- in `deleteTopic` and `bulkDelete`, the line `d.today.items = d.today.items.filter((it) => it.topicId !== id);`
- the now-unused `TodayItem` import from `../types`

- [ ] **Step 5: Strip the quest XP helpers**

In `src/lib/game.ts` delete `QUEST_BONUS`, the `QuestState` interface and the `questState`
function, plus the `/* ---- daily quests ---- */` banner above them.

- [ ] **Step 6: Strip App.tsx**

In `src/App.tsx`:

- remove `import { Today } from './views/Today';`
- remove `questState` from the `./lib/game` import and delete `const quests = useMemo(() => questState(state), [state]);`
- delete the line `{view === 'today' && <Today ... />}` from `<main>`
- in the console API, delete the whole `today: { ... }` block
- remove `quests={quests}` from the `<Guide ... />` call (Guide itself goes in Task 3)

- [ ] **Step 7: Strip the nav and palette**

In `src/components/Sidebar.tsx`, delete from `navItems`:

```ts
  const openQuests = state.today.items.filter((i) => !i.done).length;
```

and the `{ id: 'today', label: 'Quests', ... }` entry. Remove `'today'` from `MobileNav`'s
`wanted` array.

In `src/components/Palette.tsx`, delete the `{ id: 'today', label: 'Quests', icon: '⚔' }` entry
from `VIEW_TARGETS`.

- [ ] **Step 8: Strip the today commands**

In `src/lib/commands.ts` delete the command whose regex is
`/^(?:today|focus(?:\s+on)?|plan)\s+(.+)$/i` — the whole `{ re: ..., act: ... }` object.

- [ ] **Step 9: Build and verify the level did not move**

Run: `npm run build` → PASS

Then `npm run dev` and in the console:

```js
JSON.stringify(tracker.level())
```

Expected: **byte-identical** to the string recorded in Step 2. This is verification V2. If it
differs, the XP path was touched — revert and investigate before continuing.

Also confirm the app still loads, the sidebar no longer shows Quests, and no console errors fire.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: remove the quests board"
```

### Task 2: Remove Awards and the achievement engine

**Files:**
- Delete: `src/views/Awards.tsx`
- Modify: `src/types.ts`, `src/lib/game.ts`, `src/lib/store.ts`, `src/components/hud.tsx`, `src/components/Sidebar.tsx`, `src/components/Palette.tsx`, `src/views/Dashboard.tsx`, `src/App.tsx`

**Interfaces:**
- Produces: `TrackerState` without `seenAchievements`; `game.ts` without `achievements`, `Achievement`, `Tier`, `TIER_COLOR`

- [ ] **Step 1: Delete the view and the engine**

```bash
rm src/views/Awards.tsx
```

In `src/lib/game.ts` delete the entire `/* ---- achievements ---- */` section: the `Tier` type,
the `Achievement` interface, the `PATTERN_CATS` const, the `achievements` function and the
`TIER_COLOR` map.

- [ ] **Step 2: Delete the achievement components**

In `src/components/hud.tsx` delete the `AchCard` and `UnlockToast` functions and the
`import type { Achievement ... }` / `TIER_COLOR` imports they used. Keep `SHead`, `Meter`,
`Tile`, `SkillTree`, `Empty` and `Ring`.

- [ ] **Step 3: Drop the state field**

In `src/types.ts` remove `seenAchievements: string[];` from `TrackerState`.

In `src/lib/store.ts` delete the `markAchievementsSeen` method, the
`seenAchievements: [...(this.state.seenAchievements ?? [])],` line in `produce`, and
`state.seenAchievements = saved.seenAchievements ?? [];` if present.

In `src/lib/model.ts` remove `seenAchievements: [],` from `blankState` and the
`state.seenAchievements = saved.seenAchievements ?? [];` line in `loadState`.

- [ ] **Step 4: Strip App.tsx**

In `src/App.tsx` delete:

- `import { Awards } from './views/Awards';` and `import { UnlockToast } from './components/hud';`
- `achievements` from the `./lib/game` import, and `import type { Achievement } from './lib/game';`
- `const ach = useMemo(() => achievements(state), [state]);`
- `const [unlockQueue, setUnlockQueue] = useState<Achievement[]>([]);`
- both `useEffect` blocks under `// ---- celebrate newly unlocked achievements exactly once ----`
- `const unlock = unlockQueue[0] ?? null;` and the `{unlock ? <UnlockToast a={unlock} /> : null}` line
- `const unlockedCount = ach.filter((a) => a.unlocked).length;`
- the `{view === 'awards' && <Awards state={state} />}` line
- `awards: () => achievements(store.getSnapshot()),` from the console API

`navItems` is called as `navItems(state, stats, unlockedCount, dueCount)` — change the call to
`navItems(state, stats, dueCount)`.

- [ ] **Step 5: Strip the nav and palette**

In `src/components/Sidebar.tsx` change the signature to:

```ts
export function navItems(state: TrackerState, stats: Stats, dueCount: number): NavItem[] {
```

and delete the `{ id: 'awards', label: 'Awards', icon: '🏆', badge: String(unlocked) }` entry.

In `src/components/Palette.tsx` delete the `{ id: 'awards', ... }` entry from `VIEW_TARGETS`.

- [ ] **Step 6: Strip the dashboard's award grid**

In `src/views/Dashboard.tsx` delete the `AchCard` import, the `const ach = achievements(state);`
and `const unlocked = ach.filter(...)` lines, the `nearly` computation, and the entire
`{/* ---- awards ---- */}` bento block. Dashboard is rebuilt wholesale in Phase 3; this step only
removes what no longer compiles.

- [ ] **Step 7: Remove `'awards'` from ViewId**

In `src/types.ts` remove `'awards'` from the `ViewId` union and the `VIEWS` array.

- [ ] **Step 8: Build and verify**

Run: `npm run build` → PASS

`npm run dev`: the app loads, no Awards row, no unlock toast fires on completing a topic, and
`tracker.level()` still matches Task 1 Step 2.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: remove awards and the achievement engine"
```

### Task 3: Remove the Guide and all streak code

**Files:**
- Delete: `src/views/Guide.tsx`
- Modify: `src/types.ts`, `src/lib/game.ts`, `src/lib/stats.ts`, `src/components/hud.tsx`, `src/components/Sidebar.tsx`, `src/components/Palette.tsx`, `src/views/Dashboard.tsx`, `src/views/Calendar.tsx`, `src/App.tsx`

**Interfaces:**
- Produces: `stats.ts` without `completionStreak`; `game.ts` without `longestStreak`, `heatmap`, `HeatCell`; `Sidebar` without a `streak` prop

- [ ] **Step 1: Delete the Guide**

```bash
rm src/views/Guide.tsx
```

In `src/App.tsx` remove its import and the `{view === 'guide' && <Guide ... />}` line. In
`src/types.ts` remove `'guide'` from `ViewId` and `VIEWS`. In `src/components/Sidebar.tsx` delete
the `{ id: 'guide', label: 'Guide', icon: '?' }` entry. In `src/components/Palette.tsx` delete the
matching `VIEW_TARGETS` entry.

- [ ] **Step 2: Delete the streak functions**

In `src/lib/stats.ts` delete the `completionStreak` function and its doc comment.

In `src/lib/game.ts` delete `longestStreak`, the `HeatCell` interface, the `heatmap` function and
the `/* ---- streaks + activity heatmap ---- */` banner. Remove `completionStreak` from the
`./stats` import.

In `src/components/hud.tsx` delete the `Heatmap` function and the now-unused `heatmap` /
`HeatCell` / `todayISO` imports.

- [ ] **Step 3: Remove the sidebar streak line**

In `src/components/Sidebar.tsx` delete the `streak` prop from the `Props` interface and the
function signature, and delete this block from the HUD:

```tsx
        <div className="side-streak">
          <span>🔥 {streak}d streak</span>
          <span className="spacer" />
          <span>{lv.xp.toLocaleString()} XP</span>
        </div>
```

In `src/App.tsx` remove `streak={streak}` from both `<Sidebar ... />` calls and delete
`const streak = useMemo(() => completionStreak(state), [state]);` plus the `completionStreak`
import. Also remove `streak: () => completionStreak(store.getSnapshot()),` from the console API.

- [ ] **Step 4: De-streak the Calendar**

In `src/views/Calendar.tsx`:

- delete the `completionStreak` and `longestStreak` imports and the `streak` / `best` consts
- delete the two `<Tile>` blocks for "Current streak" and "Best streak", leaving Consistency
- change the remaining tile's wrapper from `className="c4"` to `className="c12"` so it spans the row
- remove `inStreak` from the `className` template on `.cal-c`:

```tsx
              className={`cal-c ${c.inMonth ? '' : 'out'} ${picked === c.date ? 'sel' : ''}`}
```

In `src/lib/calendar.ts` delete the `streakDays` function and the `inStreak` field from `DayCell`,
and remove `inStreak: streak.has(key),` from the cell literal.

- [ ] **Step 5: Strip the dashboard's streak furniture**

In `src/views/Dashboard.tsx` delete the `HeroHud` and `Heatmap` imports and every JSX block that
uses them, plus the `streak` / `best` consts. Again, Phase 3 rebuilds this file — this step only
restores compilation.

- [ ] **Step 6: Build and verify**

Run: `npm run build` → PASS

`npm run dev`: no "streak" text appears anywhere in the UI; the Calendar still shades past days by
activity; `tracker.level()` unchanged.

Run: `grep -rin "streak" src/` — expected: only `.cal-c` CSS leftovers, which Task 4 removes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove the guide and all streak code"
```

### Task 4: Data model, migration and dead CSS

**Files:**
- Modify: `src/types.ts`, `src/lib/model.ts`, `src/lib/storage.ts`, `src/styles/views.css`

**Interfaces:**
- Produces: `DayNote` type; `TrackerState.dayNotes: Record<string, DayNote>`; `SCHEMA = 3`

- [ ] **Step 1: Add the DayNote type**

In `src/types.ts`, above `TrackerState`:

```ts
export interface DayNote {
  /** raw text as typed; a line starting with "- " renders as a checkbox */
  text: string;
  /** indices of checkable lines currently ticked */
  checked: number[];
}
```

and inside `TrackerState`, after `joinedSprints`:

```ts
  /** 'YYYY-MM-DD' -> the note written for that day */
  dayNotes: Record<string, DayNote>;
```

- [ ] **Step 2: Bump the schema**

In `src/lib/storage.ts` change `export const SCHEMA = 2;` to `export const SCHEMA = 3;`. Do not
touch `KEY`.

- [ ] **Step 3: Default and clone the new field**

In `src/lib/model.ts`, add `dayNotes: {},` to the object returned by `blankState`, and in
`loadState` — inside the `if (saved && Array.isArray(saved.topics))` branch, next to the other
field defaults:

```ts
    // dropped fields (`today`, `seenAchievements`) are simply not read; neither
    // contributed to XP, completion state or history, so nothing is lost
    state.dayNotes = (saved as { dayNotes?: Record<string, DayNote> }).dayNotes ?? {};
```

Import the type: `import type { DayNote, ... } from '../types';`

In `src/lib/store.ts`, add to the `produce` draft clone:

```ts
      dayNotes: { ...this.state.dayNotes },
```

- [ ] **Step 4: Delete the dead streak CSS**

In `src/styles/views.css` delete the `.cal-c.streak` rule and the `.vital.fire .v` animation rule
inside the `prefers-reduced-motion: no-preference` block. Then delete any `.hud`, `.hud-*`,
`.vital`, `.heat`, `.heat-*`, `.ach`, `.ach-*` and `.unlock`/`.u-*` rules — every one belonged to
a component deleted in Tasks 1–3.

Verify nothing referenced remains:

```bash
grep -rE "className=\"[^\"]*(hud|vital|heat|ach|unlock)" src/ | grep -v node_modules
```

Expected: no output.

- [ ] **Step 5: Build and run V1**

Run: `npm run build` → PASS

Export a backup from the *previous* version if you have one, then in the console:

```js
tracker.topics().length     // unchanged
tracker.level()             // matches Task 1 Step 2
tracker.data().dayNotes     // {}
tracker.data().today        // undefined
tracker.data().seenAchievements  // undefined
```

Import a pre-change backup through the Import button and confirm topics, statuses and notes all
survive.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add dayNotes to the data model, drop today and seenAchievements"
```

---

# PHASE 2 — NAVIGATE

### Task 5: Rewards page

**Files:**
- Create: `src/views/Rewards.tsx`
- Modify: `src/types.ts`, `src/App.tsx`, `src/styles/views.css`

**Interfaces:**
- Produces: `<Rewards />`; `ViewId` gains `'rewards'`

- [ ] **Step 1: Add the view id**

In `src/types.ts` the `ViewId` union and `VIEWS` array become exactly:

```ts
export type ViewId = 'dashboard' | 'calendar' | 'sprints' | 'sprint' | 'revision' | 'rewards';

/** digit-shortcut order; 'sprint' is reached by click, not by number */
export const VIEWS: ViewId[] = ['dashboard', 'calendar', 'sprints', 'revision', 'rewards'];
```

- [ ] **Step 2: Create the page**

```tsx
export function Rewards() {
  return (
    <section className="view">
      <div className="panel reward-card">
        <span className="reward-mark" aria-hidden="true">☘</span>
        <h2>Finish a sprint, plant a real tree</h2>
        <p>
          Every sprint you complete will plant one tree. Your progress here will turn into
          something growing somewhere.
        </p>
        <span className="reward-soon">in the works</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Style it**

Append to `src/styles/views.css`:

```css
/* ---------- rewards ---------- */
.reward-card{
  max-width:520px;margin:8vh auto;padding:44px 34px;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:14px;
}
.reward-mark{font-size:46px;line-height:1;color:var(--ok)}
.reward-card h2{
  margin:0;font-size:var(--fs-lg);font-weight:750;letter-spacing:-.01em;max-width:16ch;
}
.reward-card p{margin:0;color:var(--tx-2);font-size:var(--fs-sm);max-width:38ch;line-height:1.6}
.reward-soon{
  font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3);
  text-transform:uppercase;letter-spacing:.8px;
  border:1px solid var(--line);border-radius:999px;padding:4px 12px;
}
```

- [ ] **Step 4: Mount it**

In `src/App.tsx` add `import { Rewards } from './views/Rewards';` and, in `<main>`:

```tsx
          {view === 'rewards' && <Rewards />}
```

- [ ] **Step 5: Build and verify**

Run: `npm run build` → PASS. Navigate to Rewards; the card centres and reads correctly in both
themes.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add the rewards coming-soon page"
```

### Task 6: Collapsible Sprints group in the sidebar

**Files:**
- Create: `src/components/NavGroup.tsx`
- Modify: `src/components/Sidebar.tsx`, `src/lib/store.ts`, `src/App.tsx`, `src/views/Sprints.tsx`, `src/styles/layout.css`

**Interfaces:**
- Consumes: `navItems(state, stats, dueCount)` from Task 2
- Produces: `<NavGroup label icon expanded active onToggle onNavigate>`; `store.toggleNavGroup()`

- [ ] **Step 1: Add the persisted toggle**

In `src/lib/store.ts`, next to `toggleCollapsed`:

```ts
  /** expand/collapse the sidebar's Sprints group; persisted like other UI state */
  toggleNavGroup(): void {
    this.produce((d) => {
      d.ui.collapsed['nav-sprints'] = d.ui.collapsed['nav-sprints'] !== true;
    }, 'soon');
  }
```

- [ ] **Step 2: Build the group component**

Create `src/components/NavGroup.tsx`:

```tsx
import type { ReactNode } from 'react';

interface Props {
  label: string;
  icon: string;
  /** the group's own row is the current page */
  active: boolean;
  expanded: boolean;
  /** collapsed icon-rail mode hides labels and children */
  rail: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  children: ReactNode;
}

export function NavGroup({ label, icon, active, expanded, rail, onToggle, onNavigate, children }: Props) {
  return (
    <div className="nav-group">
      <div className={`side-link nav-group-head ${active ? 'is-active' : ''}`}>
        <button className="nav-group-main" aria-current={active ? 'page' : undefined} onClick={onNavigate}>
          <span className="si" aria-hidden="true">{icon}</span>
          <span className="sl">{label}</span>
        </button>
        {!rail ? (
          <button
            className="nav-caret"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
            onClick={onToggle}
          >
            <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
          </button>
        ) : null}
      </div>
      {expanded && !rail ? <div className="nav-children">{children}</div> : null}
    </div>
  );
}
```

- [ ] **Step 3: Rebuild `navItems` as fixed rows only**

In `src/components/Sidebar.tsx` replace `navItems` entirely — sprints are no longer rows here,
they become children of the group. Neither `state` nor `stats` is needed any more (the sprint
child badges are rendered by the `Sidebar` component from its own props), so both parameters go
rather than being left unused, which would fail the compiler's unused-parameter check:

```ts
export function navItems(dueCount: number): NavItem[] {
  return [
    { id: 'dashboard', label: 'Base', icon: '◧' },
    { id: 'calendar', label: 'Calendar', icon: '▦' },
    { id: 'sprints', label: 'Sprints', icon: '◈' },
    { id: 'revision', label: 'Review', icon: '↻', badge: String(dueCount), hot: dueCount > 0 },
    { id: 'rewards', label: 'Rewards', icon: '☘' },
  ];
}
```

`NavItem` no longer needs its `sprintId` field — sprint rows are rendered directly by the group,
not returned from `navItems`. Delete it from the interface.

Update the call site in `src/App.tsx`:

```tsx
  const items = navItems(dueCount);
```

If `stats` is now unused in `App.tsx`, keep the `computeStats` call — `stats` is still passed to
`Sidebar` for the sprint child badges in Step 4.

- [ ] **Step 4: Render the group in the sidebar nav**

In `Sidebar.tsx`, import `NavGroup` and `joinedSprintDefs`, then replace the `items.map(...)`
body so the `sprints` row renders as a group with the joined sprints inside it:

```tsx
        {items.map((it) => {
          if (it.id !== 'sprints') {
            return (
              <button
                key={it.id}
                className="side-link"
                aria-current={view === it.id ? 'page' : undefined}
                title={collapsed ? it.label : undefined}
                onClick={() => onNavigate(it.id)}
              >
                <span className="si" aria-hidden="true">{it.icon}</span>
                <span className="sl">{it.label}</span>
                {it.badge != null && it.badge !== '' ? (
                  <span className={`sb ${it.hot ? 'hot' : ''}`}>{it.badge}</span>
                ) : null}
              </button>
            );
          }

          const sprints = joinedSprintDefs(state);
          // auto-expand while a sprint page is open, so the current sprint is never
          // hidden behind a collapsed parent
          const expanded = view === 'sprint' || state.ui.collapsed['nav-sprints'] !== true;

          return (
            <NavGroup
              key="sprints"
              label={it.label}
              icon={it.icon}
              active={view === 'sprints'}
              expanded={expanded && sprints.length > 0}
              rail={collapsed}
              onToggle={() => store.toggleNavGroup()}
              onNavigate={() => onNavigate('sprints')}
            >
              {sprints.map((sp) => (
                <button
                  key={sp.id}
                  className="side-link is-child"
                  aria-current={view === 'sprint' && state.ui.activeSprint === sp.id ? 'page' : undefined}
                  onClick={() => store.openSprint(sp.id)}
                >
                  <span className="si" aria-hidden="true">{sp.icon}</span>
                  <span className="sl">{sp.short}</span>
                  <span className="sb">{stats.bySprint[sp.id]?.pct ?? 0}%</span>
                </button>
              ))}
            </NavGroup>
          );
        })}
```

Add `stats` to the `Sidebar` `Props` interface and pass it from `App.tsx`.

- [ ] **Step 5: Style the group**

Append to `src/styles/layout.css`:

```css
/* ---------- sidebar nav group ---------- */
.nav-group{display:flex;flex-direction:column}
.nav-group-head{display:flex;align-items:center;gap:0;padding:0}
.nav-group-main{
  flex:1;min-width:0;display:flex;align-items:center;gap:10px;
  background:none;border:0;font:inherit;color:inherit;cursor:pointer;
  padding:9px 10px;text-align:left;
}
.nav-caret{
  background:none;border:0;color:var(--tx-3);cursor:pointer;padding:9px 10px;
  font-size:10px;line-height:1;
}
.nav-caret:hover{color:var(--tx)}
.nav-children{display:flex;flex-direction:column;gap:2px;margin:2px 0 4px}
.side-link.is-child{padding-left:30px;font-size:var(--fs-sm)}
.side-link.is-child .si{font-size:12px}
```

- [ ] **Step 6: Build and run V4 (partial)**

Run: `npm run build` → PASS

Verify: the sidebar shows Base, Calendar, Sprints ▾, Review, Rewards. The caret expands and
collapses; the state survives a reload. Opening a sprint auto-expands the group. Collapsing the
whole sidebar with `B` hides the children.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: collapse sprints into one sidebar group"
```

### Task 7: Top bar, mobile bar, headings and shortcuts

**Files:**
- Modify: `src/App.tsx`, `src/components/Sidebar.tsx`, `src/views/Sprints.tsx`, `src/styles/layout.css`

- [ ] **Step 1: Reduce the top bar**

In `src/App.tsx`, replace the `<header className="topbar">` contents so only New remains:

```tsx
        <header className="topbar">
          <span className="spacer" />
          <button className="btn primary" onClick={() => setModal({ id: null })}>
            <Icon name="plus" size={13} />
            <span className="lbl">New</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) store.importFile(f);
              e.target.value = '';
            }}
          />
        </header>
```

- [ ] **Step 2: Delete the mobile drawer**

In `src/App.tsx` delete `const [mobileNavOpen, setMobileNavOpen] = useState(false);`, remove
`|| mobileNavOpen` from `anyOverlay`, remove `setMobileNavOpen(false);` from the Escape handler,
delete the whole `{mobileNavOpen ? ( ... ) : null}` drawer block, and simplify `go`:

```tsx
  const go = (v: ViewId) => store.switchView(v);
```

- [ ] **Step 3: Update the mobile bar**

In `src/components/Sidebar.tsx`, `MobileNav`'s `wanted` array becomes:

```ts
  const wanted: ViewId[] = ['dashboard', 'calendar', 'sprints', 'revision', 'rewards'];
```

- [ ] **Step 4: Set the hub heading**

In `src/views/Sprints.tsx` change the first `SHead` title from `"Interview sprints"` to
`"Interview Sprints"` — sidebar says "Sprints", the page says the full name (spec D3).

- [ ] **Step 5: Fix the digit shortcuts**

`VIEWS` already holds the five ids in order (Task 5). In `src/App.tsx` change the digit test from
`/^[1-7]$/` to:

```tsx
      } else if (/^[1-5]$/.test(e.key)) {
        store.switchView(VIEWS[Number(e.key) - 1]);
      }
```

- [ ] **Step 6: Drop the dead drawer CSS**

In `src/styles/layout.css` delete the `.mdrawer`, `.mdrawer-ovl` and `.side.in-drawer` rules and
the `slideL` keyframes, plus the `.omni` rules and `.only-mobile` display rule.

Verify: `grep -rn "mdrawer\|omni\|only-mobile\|in-drawer" src/` returns no output.

- [ ] **Step 7: Build and finish V4**

Run: `npm run build` → PASS

Verify: top bar shows only New; no hamburger, no search field; `⌘K` still opens the palette;
`1`–`5` reach Base, Calendar, Sprints, Review, Rewards; `[` / `]` cycle sprints inside a sprint
view; the mobile bar at 390px shows five items and no More.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: reduce the top bar and finish the five-destination nav"
```

---

# PHASE 3 — BASE

> Independent of Phase 4 once Phase 2 has landed. The two may be built in parallel.

### Task 8: Rebuild the Base page

**Files:**
- Modify: `src/views/Dashboard.tsx`, `src/styles/views.css`

**Interfaces:**
- Consumes: `levelInfo`, `suggestNext`, `joinedSprintDefs`
- Produces: a `Dashboard` that renders only a level block and a pick-up list

- [ ] **Step 1: Replace the file wholesale**

`src/views/Dashboard.tsx` becomes:

```tsx
import type { TrackerState, ViewId } from '../types';
import { getSprint } from '../data/sprints';
import { suggestNext } from '../lib/stats';
import { levelInfo } from '../lib/game';
import { store } from '../lib/store';
import { Empty } from '../components/hud';

interface Props {
  state: TrackerState;
  onOpen: (id: string) => void;
  onGo: (v: ViewId) => void;
  onExport: () => void;
  onImport: () => void;
}

export function Dashboard({ state, onOpen, onGo, onExport, onImport }: Props) {
  const lv = levelInfo(state);
  const next = suggestNext(state, 5);
  const hasSprint = state.joinedSprints.length > 0;

  return (
    <section className="view base">
      <div className="base-lv">
        <span className="base-rank">{lv.rank}</span>
        <span className="base-n">{lv.level}</span>
        <span className="base-bar">
          <i style={{ width: `${lv.pct}%` }} />
        </span>
        <span className="base-xp">
          {lv.into} / {lv.span} XP
        </span>
      </div>

      {hasSprint ? (
        <div className="base-next">
          <span className="base-lbl">pick up</span>
          {next.length ? (
            next.map((t) => (
              <button key={t.id} className="base-row" onClick={() => onOpen(t.id)}>
                <span className="base-row-n">{t.name}</span>
                <span className="base-row-m">{getSprint(t.sprint)?.short}</span>
                <span className="base-row-c" aria-hidden="true">›</span>
              </button>
            ))
          ) : (
            <p className="muted">Everything in your sprints is done.</p>
          )}
        </div>
      ) : (
        <div className="panel">
          <Empty
            icon="◈"
            title="No sprint yet"
            msg="Join one from Sprints and your next topics will show up here."
          />
        </div>
      )}

      {/* mobile only: the sidebar footer is unreachable without the drawer */}
      <div className="base-actions only-mobile">
        <button className="btn ghost" onClick={onExport}>Export</button>
        <button className="btn ghost" onClick={onImport}>Import</button>
        <button
          className="btn ghost"
          onClick={() => store.setTheme(state.ui.theme === 'dark' ? 'light' : 'dark')}
        >
          Theme
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update the call site**

In `src/App.tsx`:

```tsx
          {view === 'dashboard' && (
            <Dashboard
              state={state}
              onOpen={openDrawer}
              onGo={go}
              onExport={() => store.exportData()}
              onImport={() => fileRef.current?.click()}
            />
          )}
```

`stats` is no longer passed to Dashboard. If `stats` becomes unused in `App.tsx`, keep it — it is
still passed to `navItems`.

- [ ] **Step 3: Style it**

Append to `src/styles/views.css`:

```css
/* ---------- base ---------- */
.base{max-width:640px;margin:0 auto;padding-top:6vh}
.base-lv{display:flex;flex-direction:column;gap:6px;margin-bottom:44px}
.base-rank{
  font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3);
  text-transform:uppercase;letter-spacing:1.2px;
}
.base-n{
  font-size:var(--fs-display);font-weight:800;line-height:1;letter-spacing:-.04em;
  color:var(--xp);font-variant-numeric:tabular-nums;
}
.base-bar{display:block;height:6px;background:var(--track);border-radius:999px;overflow:hidden;margin-top:10px}
.base-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--xp),var(--xp-2));border-radius:999px}
.base-xp{font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3)}

.base-lbl{
  display:block;font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3);
  text-transform:uppercase;letter-spacing:1.1px;margin-bottom:10px;
}
.base-next{display:flex;flex-direction:column}
.base-row{
  display:flex;align-items:center;gap:12px;width:100%;text-align:left;
  background:none;border:0;border-bottom:1px solid var(--line);
  padding:15px 4px;font:inherit;color:inherit;cursor:pointer;
  transition:padding-left var(--dur-fast) var(--ease-out),color var(--dur-fast) var(--ease-out);
}
.base-row:hover{padding-left:10px;color:var(--xp)}
.base-row-n{flex:1;min-width:0;font-size:var(--fs-md);font-weight:600}
.base-row-m{font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3)}
.base-row-c{color:var(--tx-3)}

.base-actions{display:none;gap:8px;margin-top:36px;justify-content:center}
```

In `src/styles/responsive.css`, inside the `@media (max-width:900px)` block, add:

```css
  .base-actions{display:flex}
```

- [ ] **Step 4: Build and verify**

Run: `npm run build` → PASS

Verify: Base shows a rank, a large level number, an XP bar and up to five topics — nothing else.
Clicking a row opens the topic drawer. With every sprint left, the empty state appears instead. At
390px the Export / Import / Theme row appears at the foot; at 1440px it does not.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: rebuild base as level plus pick-up"
```

---

# PHASE 4 — DAY NOTES

> Independent of Phase 3 once Phase 2 has landed.

### Task 9: Day-note parsing and index remapping

**Files:**
- Create: `src/lib/daynotes.ts`

**Interfaces:**
- Produces: `NoteLine`, `parseNote(text, checked): NoteLine[]`, `remapChecked(prev, next, checked): number[]`, `toggleLine(checked, index): number[]`

- [ ] **Step 1: Write the module**

```ts
export interface NoteLine {
  /** index into the text's line array */
  index: number;
  /** the visible text, with any "- " marker stripped */
  text: string;
  /** a line starting with "- " is checkable */
  checkable: boolean;
  checked: boolean;
}

const MARKER = /^\s*-\s+/;

export function parseNote(text: string, checked: number[]): NoteLine[] {
  const on = new Set(checked);
  return text.split('\n').map((raw, index) => {
    const checkable = MARKER.test(raw);
    return {
      index,
      text: checkable ? raw.replace(MARKER, '') : raw,
      checkable,
      checked: checkable && on.has(index),
    };
  });
}

export function toggleLine(checked: number[], index: number): number[] {
  return checked.includes(index) ? checked.filter((i) => i !== index) : [...checked, index].sort((a, b) => a - b);
}

/**
 * Keep ticks attached to their lines when the text changes.
 *
 * Ticks are stored as line indices so the text stays exactly as typed, but
 * inserting a line above a ticked one shifts every index below it. This matches
 * ticked lines by content: a ticked line keeps its tick if the same content still
 * exists, and loses it otherwise. Duplicate lines are consumed in order, so two
 * identical ticked lines stay ticked while one identical untitled line does not
 * steal a tick.
 */
export function remapChecked(prevText: string, nextText: string, checked: number[]): number[] {
  if (prevText === nextText) return checked;

  const prevLines = prevText.split('\n');
  const nextLines = nextText.split('\n');
  const taken = new Set<number>();
  const out: number[] = [];

  for (const i of [...checked].sort((a, b) => a - b)) {
    const content = prevLines[i];
    if (content == null) continue;
    const found = nextLines.findIndex((l, j) => l === content && !taken.has(j));
    if (found >= 0) {
      taken.add(found);
      out.push(found);
    }
  }
  return out.sort((a, b) => a - b);
}
```

- [ ] **Step 2: Verify the remap logic by hand**

Create a scratch file and run it:

```bash
cat > /tmp/dn.mjs <<'EOF'
import { writeFileSync } from 'node:fs';
const { build } = await import(process.cwd() + '/node_modules/esbuild/lib/main.js');
const r = await build({ entryPoints: ['src/lib/daynotes.ts'], bundle: true, write: false,
  format: 'esm', platform: 'node', logLevel: 'silent' });
writeFileSync('/tmp/dn.built.mjs', r.outputFiles[0].text);
const { parseNote, remapChecked, toggleLine } = await import('/tmp/dn.built.mjs');
const eq = (l, g, w) => console.log((JSON.stringify(g)===JSON.stringify(w)?'PASS ':'FAIL ')+l+' = '+JSON.stringify(g));

const t = 'plan\n- alpha\n- beta';
eq('parses 3 lines', parseNote(t, [1]).length, 3);
eq('line 0 not checkable', parseNote(t, [1])[0].checkable, false);
eq('marker stripped', parseNote(t, [1])[1].text, 'alpha');
eq('tick applied', parseNote(t, [1])[1].checked, true);

eq('insert above shifts tick', remapChecked(t, 'plan\nnew\n- alpha\n- beta', [1]), [2]);
eq('deleting a ticked line drops it', remapChecked(t, 'plan\n- beta', [1]), []);
eq('edit elsewhere keeps tick', remapChecked(t, 'PLAN\n- alpha\n- beta', [1]), [1]);
eq('identical text is a no-op', remapChecked(t, t, [1]), [1]);
eq('duplicates consumed in order', remapChecked('- a\n- a', '- a\n- a', [0,1]), [0,1]);
eq('toggle on', toggleLine([], 2), [2]);
eq('toggle off', toggleLine([1,2], 2), [1]);
EOF
node /tmp/dn.mjs```

Expected: all eleven lines PASS. This is verification V3's logic half.

- [ ] **Step 3: Build and commit**

Run: `npm run build` → PASS

```bash
rm -f /tmp/dn.mjs /tmp/dn.built.mjs
git add -A && git commit -m "feat: add day-note parsing and index remapping"
```

### Task 10: Day-note store mutations

**Files:**
- Modify: `src/lib/store.ts`

**Interfaces:**
- Consumes: `remapChecked`, `toggleLine` from Task 9
- Produces: `store.setDayNote(date, text)`, `store.toggleDayLine(date, index)`

- [ ] **Step 1: Add the mutations**

In `src/lib/store.ts` import the helpers:

```ts
import { remapChecked, toggleLine } from './daynotes';
```

and add a section after the topic mutations:

```ts
  // ---------- day notes ----------
  /**
   * Write a day's note. Ticks are remapped against the new text so they stay
   * attached to their lines; an empty note is deleted rather than stored blank.
   */
  setDayNote(date: string, text: string): void {
    this.produce((d) => {
      const prev = d.dayNotes[date];
      if (!text.trim()) {
        delete d.dayNotes[date];
        return;
      }
      d.dayNotes[date] = {
        text,
        checked: prev ? remapChecked(prev.text, text, prev.checked) : [],
      };
    }, 'soon');
  }

  toggleDayLine(date: string, index: number): void {
    this.produce((d) => {
      const note = d.dayNotes[date];
      if (!note) return;
      d.dayNotes[date] = { ...note, checked: toggleLine(note.checked, index) };
    });
  }
```

`setDayNote` persists with `'soon'` (the 250ms debounce) because it fires on every keystroke;
`toggleDayLine` persists immediately because it is a discrete action. Both are flushed on
`pagehide` by the existing wiring.

- [ ] **Step 2: Expose on the console API**

In `src/App.tsx`, in the console API object:

```tsx
      notes: () => store.getSnapshot().dayNotes,
      note: (date: string, text: string) => store.setDayNote(date, text),
```

- [ ] **Step 3: Build and verify persistence**

Run: `npm run build` → PASS

`npm run dev`, then in the console:

```js
tracker.note('2026-08-22', 'plan\n- alpha\n- beta');
tracker.notes()                       // the note is there, checked: []
location.reload()
tracker.notes()['2026-08-22'].text    // survives the reload
tracker.note('2026-08-22', '')        // empty deletes it
tracker.notes()['2026-08-22']         // undefined
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add day-note store mutations"
```

### Task 11: The day-note editor

**Files:**
- Create: `src/components/DayNote.tsx`
- Modify: `src/views/Calendar.tsx`, `src/lib/calendar.ts`, `src/styles/views.css`

**Interfaces:**
- Consumes: `parseNote` (Task 9), `store.setDayNote` / `store.toggleDayLine` (Task 10)
- Produces: `<DayNote date note />`; `DayCell.hasNote: boolean`

- [ ] **Step 1: Build the editor**

Create `src/components/DayNote.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { DayNote as DayNoteData } from '../types';
import { parseNote } from '../lib/daynotes';
import { store } from '../lib/store';

const PLACEHOLDER = 'What are you doing today?\nStart a line with "- " to make it tickable.';

export function DayNote({ date, note }: { date: string; note: DayNoteData | undefined }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.text ?? '');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // a different day was selected — drop any in-flight draft
  useEffect(() => {
    setEditing(false);
    setDraft(note?.text ?? '');
  }, [date, note?.text]);

  // debounce writes so typing does not thrash storage
  useEffect(() => {
    if (!editing) return;
    const id = setTimeout(() => store.setDayNote(date, draft), 400);
    return () => clearTimeout(id);
  }, [draft, editing, date]);

  useEffect(() => {
    if (editing) areaRef.current?.focus();
  }, [editing]);

  function stopEditing() {
    store.setDayNote(date, draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        ref={areaRef}
        className="dn-edit"
        value={draft}
        placeholder={PLACEHOLDER}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={stopEditing}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            stopEditing();
          }
        }}
      />
    );
  }

  const lines = parseNote(note?.text ?? '', note?.checked ?? []);
  const empty = !note?.text.trim();

  return (
    <div className="dn-read">
      {empty ? (
        <button className="dn-empty" onClick={() => setEditing(true)}>
          {PLACEHOLDER.split('\n')[0]}
        </button>
      ) : (
        lines.map((ln) =>
          ln.checkable ? (
            <label key={ln.index} className={`dn-line dn-check ${ln.checked ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={ln.checked}
                onChange={() => store.toggleDayLine(date, ln.index)}
              />
              <span>{ln.text}</span>
            </label>
          ) : (
            <p key={ln.index} className="dn-line" onClick={() => setEditing(true)}>
              {ln.text || ' '}
            </p>
          ),
        )
      )}
      {!empty ? (
        <button className="dn-edit-btn" onClick={() => setEditing(true)}>
          edit
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Mark days that have a note**

In `src/lib/calendar.ts` add to `DayCell`:

```ts
  /** the user wrote something for this day */
  hasNote: boolean;
```

and inside the cell literal in `monthGrid`:

```ts
      hasNote: Boolean(state.dayNotes[key]?.text.trim()),
```

- [ ] **Step 3: Render the note dot and the editor**

In `src/views/Calendar.tsx`, inside the cell button, after the `cal-due` span:

```tsx
              {c.hasNote ? <span className="cal-dot" aria-hidden="true" /> : null}
```

and extend the cell's `aria-label` so the dot is not visual-only:

```tsx
              aria-label={`${c.date}: ${c.completions} completed${c.dueReviews ? `, ${c.dueReviews} due` : ''}${c.hasNote ? ', has a note' : ''}`}
```

In the day panel, add the editor above the linked list, and relabel that list:

```tsx
          <DayNote date={detail.date} note={state.dayNotes[detail.date]} />

          {detail.completed.length || detail.revised.length || detail.due.length ? (
            <>
              <span className="dn-linked-lbl">linked</span>
              <div className="cal-list">
                {/* existing completed / revised / due buttons, unchanged */}
              </div>
            </>
          ) : null}
```

Delete the old `{!detail.completed.length && !detail.revised.length && !detail.due.length ? (<p className="muted">Nothing logged…</p>) : null}` block — the note editor now fills that space, so
"nothing here" is no longer true.

Import `DayNote` at the top of the file.

- [ ] **Step 4: Style it**

Append to `src/styles/views.css`:

```css
/* ---------- day note ---------- */
.dn-read{display:flex;flex-direction:column;gap:2px;margin:4px 0 14px}
.dn-line{
  margin:0;padding:3px 2px;font-size:var(--fs-sm);line-height:1.55;
  cursor:text;border-radius:var(--r-sm);
}
.dn-line:hover{background:var(--panel-2)}
.dn-check{display:flex;align-items:flex-start;gap:9px;cursor:pointer}
.dn-check input{width:15px;height:15px;margin-top:2px;accent-color:var(--ok);flex:none}
.dn-check.on span{color:var(--tx-3);text-decoration:line-through}
.dn-empty{
  background:none;border:0;padding:6px 2px;font:inherit;font-size:var(--fs-sm);
  color:var(--tx-3);cursor:text;text-align:left;
}
.dn-edit{
  width:100%;min-height:180px;resize:vertical;font-family:var(--sans);
  font-size:var(--fs-sm);line-height:1.55;margin:4px 0 14px;
}
.dn-edit-btn{
  align-self:flex-start;margin-top:6px;background:none;border:0;padding:2px;
  font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3);cursor:pointer;
}
.dn-edit-btn:hover{color:var(--tx)}
.dn-linked-lbl{
  display:block;font-family:var(--mono);font-size:var(--fs-xs);color:var(--tx-3);
  text-transform:uppercase;letter-spacing:1px;
  border-top:1px solid var(--line);padding-top:12px;margin-top:4px;
}
.cal-dot{
  position:absolute;right:5px;top:5px;width:5px;height:5px;border-radius:50%;
  background:var(--xp);
}
```

- [ ] **Step 5: Build and run V3**

Run: `npm run build` → PASS

`npm run dev`, open Calendar, click today:

- Click the placeholder, type `plan for the day`, then `- alpha` and `- beta` on new lines. Blur.
- The two dashed lines render as checkboxes; the first line renders as text.
- Tick `alpha`. Reload the page. The text and the tick both survive.
- Re-enter edit mode, insert a new line **above** `- alpha`, blur. `alpha` is still ticked.
- Delete the `- alpha` line entirely. No stray tick remains on `- beta`.
- The month cell for today shows a dot in its corner.
- Select a different day: the editor is empty, and returning to today shows the note again.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add the day-note editor to the calendar"
```

---

# PHASE 5 — POLISH

### Task 12: Minimal visual pass

**Files:**
- Modify: `src/styles/views.css`, `src/styles/layout.css`, `src/styles/components.css`, `src/App.tsx`

- [ ] **Step 1: One accent per page**

In `src/styles/views.css`, scope the accent so no page carries four at once:

```css
/* one accent per surface — sprint pages already set --sprint inline */
.view.base{--accent:var(--xp)}
.view.cal{--accent:var(--ok)}
```

In `src/views/Calendar.tsx` change the root to `<section className="view cal">`. In the calendar
styles, replace `var(--sprint)` with `var(--accent,var(--ok))` in `.cal-c:hover`, `.cal-c.sel` and
`.cal-item:hover`.

- [ ] **Step 2: Add view transitions**

Append to `src/styles/views.css`:

```css
@media (prefers-reduced-motion: no-preference){
  @keyframes viewIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  main > .view{animation:viewIn var(--dur) var(--ease-out)}
}
```

- [ ] **Step 3: Loosen the rhythm**

In `src/styles/layout.css`, increase the main padding now that pages carry less:

```css
main{padding:26px 30px 60px;max-width:var(--maxw);width:100%;margin:0 auto}
```

(keep the existing mobile override in `responsive.css`).

- [ ] **Step 4: Sweep dead CSS**

```bash
grep -rE "className=\"[^\"]*(quest|award|guide|hud|vital|heat|unlock|omni|mdrawer)" src/
```

Expected: no output. Then remove any surviving rules for those class names from
`src/styles/*.css`.

- [ ] **Step 5: Run V5**

Run: `npm run build` → PASS

Run: `wc -l src/**/*.ts* src/*.ts* src/styles/*.css | awk '$1>800 && $2!="total"'` → no output.

Check every page — Base, Calendar, Sprints, a sprint, Review, Rewards — in **both** themes at
390px, 768px and 1440px. Confirm no horizontal overflow and visible focus rings throughout.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: minimal visual pass across the reduced surface"
```

### Task 13: Update the README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite the affected sections**

- **Interface** — five destinations; Sprints is a collapsible group; the top bar holds only New.
- Delete the **Game mechanics** subsections for quests and awards; keep XP, levels and ranks.
  State plainly that XP comes from completions and revisions only.
- Delete every mention of streaks and the activity heatmap.
- **Calendar** — describe day notes: free text, `- ` lines become checkboxes, ticks survive edits
  above them, a dot marks days with a note.
- **Keyboard** — `1`–`5` map to Base, Calendar, Sprints, Review, Rewards; `[` / `]` cycle sprints;
  `←` `→` `T` on the Calendar. Remove the `/` search row if the omnibox is gone.
- **Console API** — remove `tracker.awards()`, `tracker.streak()` and `tracker.today.*`; add
  `tracker.notes()` and `tracker.note(date, text)`.
- **Source layout** — remove `views/Today.tsx`, `views/Awards.tsx`, `views/Guide.tsx`; add
  `lib/daynotes.ts`, `components/DayNote.tsx`, `components/NavGroup.tsx`, `views/Rewards.tsx`.
- Add a short **Rewards** section stating that finishing a sprint will plant a tree, and that it
  is not implemented yet.

- [ ] **Step 2: Final build and commit**

```bash
npm run build
git add -A && git commit -m "docs: update the README for the minimal tracker"
```

---

## Verification summary

| Spec check | Runs in |
|---|---|
| V1 — data survival | Task 4 Step 5 |
| V2 — level stability | Task 1 Steps 1, 2 and 9 |
| V3 — day notes | Task 9 Step 2 (logic), Task 11 Step 5 (behaviour) |
| V4 — navigation | Task 6 Step 6, Task 7 Step 7 |
| V5 — build and layout | Task 12 Step 5 |

## Success criteria (spec §14)

1. Five destinations; Quests, Awards and Guide gone — Tasks 1–3, 7
2. Existing save opens with identical topics, statuses, notes and level — Task 4 Step 5
3. Base shows a level and at most five topics — Task 8 Step 4
4. A day note survives reload; ticks are independent of text — Task 11 Step 5
5. No streak counter anywhere; calendar shading still works — Task 3 Step 6
6. Build passes; both themes at all three widths — Task 12 Step 5

## Parallelism

Tasks 1 → 7 are strictly sequential. After Task 7 lands, **Task 8 (Phase 3)** and
**Tasks 9–11 (Phase 4)** touch disjoint files and may run concurrently:

- Task 8 owns `views/Dashboard.tsx`
- Tasks 9–11 own `lib/daynotes.ts`, `components/DayNote.tsx`, `views/Calendar.tsx`, `lib/calendar.ts`

Both append to `styles/views.css` — merge that file's additions rather than overwriting. Tasks 12
and 13 run last, after both branches land.
