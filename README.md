# Interview Sprint Tracker

Track what you are actually preparing for. **HLD** and **LLD** ship as the first two
*sprints*; more can be added as data files without touching a line of UI code.

React + TypeScript + Vite. No backend, no account, no database.
All progress lives in your browser's `localStorage` under the key `hld-lld-tracker/v1`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build locally
```

## Deploy to Vercel

Vercel auto-detects Vite — no config file needed.

| Route | Steps |
|---|---|
| Dashboard | New Project → import the repo → Deploy |
| CLI | `npx vercel` (preview) then `npx vercel --prod` |

Build command `npm run build`, output directory `dist`. Both are detected automatically.

`localStorage` is scoped **per origin**. `localhost:5173` and `https://yourdomain.vercel.app`
each keep a separate copy. Pick one URL and stay on it; to migrate, Export on the old one and
Import on the new one.

## Interview sprints

A **sprint** is a curriculum you explicitly join. The Sprints hub lists the ones you are on,
the ones you can add, and the tracks still on the roadmap.

Joining or leaving scopes **attention, never data**:

| | Scoped to joined sprints |
|---|---|
| Sidebar rows, Review queue, Base pick-up list | Yes |
| Search and ⌘K | No — you can always reach anything |
| **XP, levels, calendar history** | **No — lifetime, all sprints** |

So leaving a sprint quiets it without ever costing you a level or re-locking a badge. Nothing
is deleted, and rejoining restores it instantly. Completing a topic in a sprint you have left
still earns XP — leaving changes what the app *suggests*, not what you
are allowed to do.

## Calendar

A month grid built entirely from data the tracker already has:

- **Past days** shade by how much you logged that day.
- **Future days** show `◷n` review pips, read from the spaced-repetition schedule — including
  for topics completed before the SRS feature existed.
- **Selecting a day** lists what you completed, revised, and what falls due, each opening the
  topic drawer.

`history` stores a count per day while a topic remembers only its latest completion, so a topic
completed, reset and re-completed shows on the later date. When a day's logged count exceeds
what can be named, the panel says `+N more` rather than misreporting it.

## Interface

Five destinations:

| | |
|---|---|
| **Base** | your level, and the handful of topics to pick up next |
| **Calendar** | month grid plus a writable note for every day |
| **Sprints** | a collapsible group; the joined sprints sit inside it |
| **Review** | the spaced-repetition queue |
| **Rewards** | coming soon — finish a sprint, plant a tree |

- **Sidebar** carries the persistent level/XP HUD and collapses to a 64px icon rail (`B`).
- **Mobile** swaps it for a bottom tab bar over the same five destinations. Export, import and
  theme move to the foot of the Base page there, since there is no drawer.
- **Top bar** holds only **New**. `⌘K` still opens the command palette, which is how you search.
- **Topic drawer** — click any topic name for notes (autosaving), review schedule, status, history.
- **Bulk edit**, **Undo** — unchanged.


## Data

- Saved synchronously on every change — closing the tab immediately after a click is safe.
  Only cosmetic state (search text, collapsed sections) is debounced, and that flushes on
  `pagehide`/`visibilitychange`.
- **Export** (↓ in the header) downloads `hld-lld-tracker-YYYY-MM-DD.json`. Commit it to a repo for free version history.
- **Import** (↑) restores a backup and replaces current data.
- Clearing site data wipes it. Private windows keep it only until the window closes.
- Two open tabs stay in sync via the `storage` event.
- Redeploying keeps your data: new catalogue topics are merged in, topics you deleted stay
  deleted, statuses you set are never overwritten.

## Game mechanics

XP comes from **completions and revisions only**. Every mechanic is derived from your existing progress, never stored — so the numbers can
never drift from reality, and an old backup gains a level and badges the moment you import it.

| Action | XP |
|---|---|
| Complete an Easy topic | +10 |
| Complete a Medium topic | +25 |
| Complete a Hard topic | +50 |
| Log a revision | +15 |

- **Levels** — level *L* requires `20 · (L−1) · L` cumulative XP. Clearing the full catalogue
  lands around level 13.
- **Ranks** — Initiate → Novice → Practitioner → Journeyman → Senior → Architect → Distinguished.
- **Skill paths** — each track unlocks at 40% of the previous one. The lock is a suggested
  route, not a wall — you can still click through.

## Spaced repetition

The Review tab is a scheduler, not a list. Completing a topic schedules it 1 day out; each
clean recall walks it one rung up the ladder, a struggle drops it back to the first rung and
flags it Needs Revision.

```
1d → 3d → 7d → 14d → 30d → 60d → 120d
```

Both outcomes log a review and pay `+15 XP`, so there is no incentive to lie to yourself.
Saves written before this existed still work: a completed topic without a schedule is dated
lazily from its completion date, and a flagged one is treated as due now.

## Catalogue

114 seeded topics — HLD 54 (Fundamentals, Core Components, Database & Storage, Distributed
Systems, 21 HLD Problems) and LLD 60 (SOLID, Creational / Structural / Behavioral patterns,
36 LLD Problems). Pre-marked completed: Factory, Decorator, Observer, Strategy, SOLID Principles.

### Adding a sprint

One data file plus one registry line — no UI, navigation or CSS changes. The sprint themes
itself from its own `accent`, generates its own "clear the sprint" award, and appears on the
hub, the sidebar, the dashboard and ⌘K automatically.

```ts
// src/data/sprints/striver.ts
import type { SprintDef } from './types';

export const striver: SprintDef = {
  id: 'striver',                    // PERMANENT — see the warning below
  name: 'Striver DSA',
  short: 'DSA',
  tagline: 'Arrays to graphs to DP',
  icon: '🧮',
  accent: '#22d3ee',
  categories: [
    { name: 'Arrays', rank: 0, rows: [['Two Sum', 'Easy'], ['3Sum', 'Medium']] },
  ],
};
```

```ts
// src/data/sprints/index.ts
export const SPRINTS: SprintDef[] = [hld, lld, striver];
```

> **A sprint `id` is permanent.** Each topic's stable `sid` is derived as
> `` `${sprintId}|${category}|${name}` ``, and that string is how saved progress reattaches
> to the catalogue on load. Renaming an id orphans every topic in that sprint. Renaming a
> *category* or a *topic* orphans just that row. Removing a sprint file is safe: its topics
> stay in the save, are reassigned to the first registered sprint, and the id is dropped from
> `joinedSprints`.

Progress is never hard-coded:

```
HLD %     = completed HLD topics / total HLD topics
LLD %     = completed LLD topics / total LLD topics
Overall % = completed topics      / total topics
```

Add, delete, complete or reset anything and every number on the dashboard recomputes on the next render.

## Keyboard

| Key | Action |
|---|---|
| `⌘K` / `Ctrl K` | command bar |
| `N` | new topic |
| `1`–`5` | switch views (Base, Calendar, Sprints, Review, Rewards) |
| `[` / `]` | cycle between joined sprints |
| `←` / `→` / `T` | calendar: previous month / next month / today |
| `B` | collapse / expand the sidebar |
| `J` / `K` | move the row cursor |
| `Enter` | open the focused topic |
| `X` | select the focused topic |
| `⌘Z` / `Ctrl Z` | undo the last destructive action |
| `Esc` | close dialog |

## Command bar

`⌘K` is both a fuzzy jump and a command bar. Type a topic name to jump straight to its detail
drawer; start with a verb and it runs as a command instead. The mode indicator on the right
tells you which one you are in.

Commands also work as `tracker.run('…')` in the console.

```
completed Parking Lot
started Kafka
add Design Reddit
add Rate Limiter to Behavioral Patterns
move Singleton to revision
revised Singleton
reset Sharding
remove Pastebin
today Elevator System
note on CAP: PACELC is the follow-up
show my HLD progress
what should I study next
```

## Console API

```js
tracker.run('completed Parking Lot')  // plain-English command → { ok, msg, topic }
tracker.level()                       // { level, rank, xp, into, span, toNext }
tracker.sprints()                     // { registered, joined }
tracker.notes()                       // every day note
tracker.note('2026-08-22', '- do the thing')
tracker.join('lld') | tracker.leave('lld')
tracker.calendar(2026, 7)             // month grid cells (month is 0-indexed)
tracker.stats()                       // { all, hld, lld, patterns, problems, byCat, byDiff, … }
tracker.next(5)                       // ranked "study next" list
tracker.topics()                      // every topic object
tracker.data()                        // the whole persisted state
tracker.complete|start|revise|revised|reset|remove('<fuzzy name>')
tracker.add({ name, type, category, difficulty, status, notes })
tracker.move('Singleton', 'Behavioral Patterns')
tracker.reviews()                     // { due, flagged, upcoming }
tracker.review('CAP Theorem','good')  // 'good' walks the ladder, 'hard' resets it
tracker.undo()                        // reverse the last destructive action
tracker.export() | tracker.wipe()
```

## Source layout

```
src/
├── main.tsx            entry
├── App.tsx             shell: tabs, shortcuts, modals, console API
├── styles/             tokens · base · layout · components · views
├── types.ts            Topic / TrackerState / Stats
├── data/sprints/       the sprint registry — add a sprint here
│   ├── index.ts        SPRINTS, getSprint, resolveSprint, seedRows
│   ├── hld.ts          High Level Design — 54 topics
│   ├── lld.ts          Low Level Design — 60 topics
│   └── teasers.ts      locked roadmap cards
├── lib/
│   ├── storage.ts      localStorage driver with in-memory fallback
│   ├── model.ts        makeTopic, blankState, non-destructive seed merge
│   ├── store.ts        external store (useSyncExternalStore) + all mutations
│   ├── stats.ts        derived progress, "study next" ranking
│   ├── game.ts         XP, levels, ranks, skill tree
│   ├── commands.ts     plain-English command engine + fuzzy topic matching
│   ├── toasts.ts       toast store
│   └── utils.ts        date / string / percentage helpers
│   ├── srs.ts          spaced-repetition ladder, due dates, review buckets
│   ├── scope.ts        activeTopics — the single definition of "joined"
│   ├── daynotes.ts     day-note parsing + tick remapping
│   ├── calendar.ts     month grid, day detail, consistency
│   └── dialog.ts       themed promise-based confirm()
├── hooks/useFocusTrap.ts  keyboard trap + focus restore for overlays
├── components/         Sidebar, NavGroup, Icons, hud, SprintCard, DayNote,
│                       TopicRow, TopicDrawer, TopicModal, Palette, ConfirmDialog
└── views/              Dashboard, Calendar, Sprints, TopicsView, Revision, Rewards
```

To add topics permanently, edit the relevant file in `src/data/sprints/` and redeploy —
existing progress survives because merging is keyed on a stable seed id derived from
sprint + category + name.
