# HLD + LLD Tracker

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

## Interface

- **Sidebar** carries the persistent level/XP/streak HUD, so progression is visible on every
  view. Collapses to a 64px icon rail (`B`), and the state persists.
- **Mobile** swaps it for a bottom tab bar over the five main destinations, plus a drawer
  holding the HUD, secondary views and actions.
- **Topic drawer** — click any topic name for notes (autosaving), review schedule, status,
  and history. Notes are searchable from the list and from ⌘K.
- **Bulk edit** — select rows with `X` or the checkbox, then complete / start / revise /
  reset / move / delete in one go.
- **Undo** — every destructive action offers Undo in its toast, or `⌘Z`.

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

Every mechanic is **derived from your existing progress**, never stored — so the numbers can
never drift from reality, and an old backup gains a level and badges the moment you import it.

| Action | XP |
|---|---|
| Complete an Easy topic | +10 |
| Complete a Medium topic | +25 |
| Complete a Hard topic | +50 |
| Log a revision | +15 |
| Clear the whole quest board | +40 |

- **Levels** — level *L* requires `20 · (L−1) · L` cumulative XP. Clearing the full catalogue
  lands around level 13.
- **Ranks** — Initiate → Novice → Practitioner → Journeyman → Senior → Architect → Distinguished.
- **Awards** — 19 achievements across bronze/silver/gold/legendary. Locked ones show live
  progress; each unlock is celebrated once (tracked in `seenAchievements`).
- **Skill paths** — each track unlocks at 40% of the previous one. The lock is a suggested
  route, not a wall — you can still click through.
- **Activity heatmap** — 20 weeks of contributions rendered from the `history` map, plus
  current and longest streak.
- **Quests** — Today's Focus, capped at 5/day, with per-quest XP and a board-clear bonus.

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
| `/` | focus search |
| `N` | new topic |
| `1`–`7` | switch views |
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
tracker.awards()                      // 19 achievements with live progress
tracker.streak()                      // current streak in days
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
tracker.today.add('Kafka') | tracker.today.carry()
tracker.export() | tracker.wipe()
```

## Source layout

```
src/
├── main.tsx            entry
├── App.tsx             shell: tabs, shortcuts, modals, console API
├── styles.css          design tokens + all component styles
├── types.ts            Topic / TrackerState / Stats
├── data/seed.ts        the 114-topic catalogue — edit here to add topics
├── lib/
│   ├── storage.ts      localStorage driver with in-memory fallback
│   ├── model.ts        makeTopic, blankState, non-destructive seed merge
│   ├── store.ts        external store (useSyncExternalStore) + all mutations
│   ├── stats.ts        derived progress, streak, "study next" ranking
│   ├── game.ts         XP, levels, ranks, achievements, heatmap, skill tree
│   ├── commands.ts     plain-English command engine + fuzzy topic matching
│   ├── toasts.ts       toast store
│   └── utils.ts        date / string / percentage helpers
│   ├── srs.ts          spaced-repetition ladder, due dates, review buckets
│   └── dialog.ts       themed promise-based confirm()
├── hooks/useFocusTrap.ts  keyboard trap + focus restore for overlays
├── components/         Sidebar, Icons, hud, TopicRow, TopicDrawer, TopicModal,
│                       Palette, ConfirmDialog
└── views/              Dashboard, TopicsView, Today, Revision, Awards, Guide
```

To add topics permanently, edit `SEED` in `src/data/seed.ts` and redeploy — existing progress
survives because merging is keyed on a stable seed id derived from type + category + name.
