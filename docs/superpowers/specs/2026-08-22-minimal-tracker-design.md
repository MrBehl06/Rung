# Minimal Tracker — Design

**Date:** 2026-08-22
**Status:** Approved for planning
**Repo:** `/Users/apple/Projects-Hosted/Tracker`
**Supersedes parts of:** `2026-08-18-interview-sprints-design.md` (sprint registry and calendar stay; Quests, Awards and Guide are removed)

---

## 1. Problem

The app grew eight navigation destinations and a dashboard carrying four stat tiles, two
progress panels, a quest board, a recommendation list, two skill trees, an award grid and a
category table. Every one of those was individually justified; together they read as a control
panel rather than a study tool. The user's instruction is to reduce it to what is actually used
and make what remains feel calm and current.

Separately, the Calendar added in the previous cycle is read-only. Days can be inspected but
nothing can be written on them, so planning still has nowhere to live now that Quests are going.

## 2. Goals

- Cut navigation from eight destinations to five.
- Reduce the dashboard to a level and a single clear next action.
- Replace the Quests board with **day notes** on the Calendar — free text with checkable lines.
- Remove streak *pressure* while keeping the Calendar visually alive.
- Collapse the sprint rows into one expandable sidebar item.
- State the tree-planting reward as an honest coming-soon page.
- Leave the app minimal, engaging and smooth.

## 3. Non-goals

- No change to the sprint registry, seed catalogue, `sid` derivation or storage key.
- No change to the spaced-repetition ladder or the Review view.
- No change to the XP curve, level thresholds or rank names.
- No automated tests (carried over from the previous cycle; verification is manual).
- The tree-planting reward is **not implemented** — only announced.

## 4. Decisions taken

| # | Decision |
|---|---|
| D1 | Streak *language* removed everywhere; Calendar keeps day shading from `history` |
| D2 | Day notes are free text; a line beginning `- ` renders as a checkbox |
| D3 | Sidebar label "Sprints"; page heading "Interview Sprints" |
| D4 | Top bar keeps only **New**; export / import / theme move to the sidebar footer |
| D5 | Base = level + "pick up where you left off" |
| D6 | Calendar is the second sidebar item, on its own full page |
| D7 | Rewards is a nav item leading to one coming-soon page |

### 4.1 The one thing that could have gone wrong

`totalXp` in `src/lib/game.ts` sums **only** completed-topic XP and `revisionCount × 15`.
`QUEST_BONUS` is declared but never added to the total. Removing the quest board therefore
**cannot** reduce anyone's XP, level or rank. This was verified by reading the function before
the design was written, and it is the reason Quests can be deleted outright rather than
migrated.

### 4.2 Two note surfaces, deliberately not linked

`Topic.notes` (what you learned about *a topic*) and the new day notes (what you plan to do on
*a day*) stay separate and never write to each other. Cross-linking them was considered and
rejected: a topic note edited from a calendar day would need conflict handling against the
drawer's autosave, and the two have different lifetimes — a topic note is permanent, a day note
is a moment. The Calendar's day panel still *shows* that day's completions and due reviews as a
read-only "linked" list, so the connection is visible without being editable in two places.

---

## 5. Navigation

```
◧ Base          level + pick up where you left off
▦ Calendar      month grid + day notes
◈ Sprints  ▾    expands to the joined sprints
    HLD
    LLD
↻ Review        spaced repetition (unchanged)
☘ Rewards       coming soon — finish a sprint, plant a tree
```

- Digit shortcuts `1`–`5` map to Base, Calendar, Sprints, Review, Rewards. The individual
  sprints are reached by clicking, by `[` / `]` inside a sprint view, or via ⌘K.
- The Sprints row expands and collapses; state persists in the existing `ui.collapsed` map under
  the key `nav-sprints`. It auto-expands when a sprint view is active, so the current sprint is
  never hidden behind a collapsed parent.
- With no sprint joined, the Sprints row has no children and navigates straight to the hub.

**Mobile** bottom bar: Base, Calendar, Sprints, Review, Rewards — the same five, no More tab.

**Top bar** keeps only the **New** button. The omnibox and hamburger are removed; ⌘K still opens
the command palette from the keyboard, and the palette remains the way to search topics.

Export, import and theme live in the sidebar footer, which is already how they work on desktop
and needs no change there.

> **The one place a removal costs something.** On mobile the sidebar is a drawer, and the
> hamburger was the only thing that opened it — so deleting the hamburger would make export,
> import and theme unreachable on a phone. Rather than leave that dead end, the mobile layout
> renders those three actions as a small row at the foot of the **Base** page. The mobile drawer
> and its overlay are then deleted entirely, since nothing opens them any more.

---

## 6. Removals

| Removed | Files |
|---|---|
| Quests board | `src/views/Today.tsx`; `today` state; `addToday`, `toggleTodayDone`, `removeToday`, `carryToTomorrow`, `clearTodayDone`, `rollTodayIfNeeded` in `store.ts`; `questState`, `QuestState`, `QUEST_BONUS` in `game.ts` |
| Awards | `src/views/Awards.tsx`; `achievements`, `Achievement`, `Tier`, `TIER_COLOR` in `game.ts`; `AchCard`, `UnlockToast` in `hud.tsx`; `seenAchievements` state; `markAchievementsSeen`; the unlock queue in `App.tsx` |
| Guide | `src/views/Guide.tsx` |
| Streaks | `completionStreak` in `stats.ts`; `longestStreak`, `heatmap`, `HeatCell` in `game.ts`; `Heatmap` in `hud.tsx`; the sidebar HUD streak line |
| Dashboard furniture | `HeroHud` in `hud.tsx`; the stat tiles, mastery panel, lifetime panel, award grid and category table in `Dashboard.tsx` |
| Top bar | the omnibox button and the mobile hamburger in `App.tsx`; the mobile drawer and its overlay, since nothing opens them once the hamburger is gone |

**Kept deliberately:** `skillTree` and the sprint path panel on the sprint page — it is the
sprint's own structure, not dashboard furniture, and it is how categories are filtered.
`history` and `bumpHistory` are kept: they feed calendar shading even though no streak is shown.

Deleted code remains recoverable from git history at `063bb8a`.

---

## 7. Data model

```ts
export interface DayNote {
  /** raw text as typed; a line starting with "- " renders as a checkbox */
  text: string;
  /** indices of checkable lines currently ticked */
  checked: number[];
}

export interface TrackerState {
  schema: number;              // 2 → 3
  topics: Topic[];
  history: Record<string, number>;
  removedSeeds: string[];
  joinedSprints: string[];
  /** 'YYYY-MM-DD' → the note written for that day */
  dayNotes: Record<string, DayNote>;
  ui: UiState;
  createdAt: string;
  updatedAt: string;
}
```

Removed from `TrackerState`: `today`, `seenAchievements`.

### 7.1 Why `checked` is an index list

The alternative — rewriting `- ` to `x ` inside the text — would mutate what the user typed and
make un-ticking lossy. Storing indices keeps `text` exactly as written. The trade-off is that
inserting a line above a ticked one shifts its index; the editor therefore **remaps `checked` on
every edit** by matching line content before and after, and drops indices whose line no longer
exists. This is the only non-obvious logic in the feature and it lives in one pure function,
`remapChecked(prevText, nextText, checked): number[]`.

### 7.2 Migration

All handled on read in `model.ts`, alongside the existing sprint migration:

- `dayNotes` absent → `{}`.
- `today` and `seenAchievements` present in an old save → ignored and dropped on next write.
  Neither contributes to XP, completion state or history, so nothing is lost that affects
  progress.
- `SCHEMA` 2 → 3. The storage `KEY` stays `hld-lld-tracker/v1`.
- Exported backups from the previous version import cleanly; their `today` and `seenAchievements`
  keys are simply not read.

---

## 8. Base page

```
Practitioner
6
▓▓▓▓▓▓▓▓▓▓▓░░░░   225 / 240 XP

── pick up ──────────────────
Consistent Hashing      HLD  ›
Rate Limiter            LLD  ›
Design Uber             HLD  ›
```

- Level, rank and progress to the next level, set large. Sourced from `levelInfo` unchanged.
- "Pick up" lists up to five topics from `suggestNext`, which already prefers work in flight,
  then fundamentals, then easy wins, and is already scoped to joined sprints. Each row opens the
  topic drawer.
- With no sprint joined, the pick-up list is replaced by a single line pointing at Sprints.
- On mobile only, the export / import / theme row renders at the bottom (see §5).

## 9. Calendar and day notes

Layout is unchanged from the previous cycle — month grid left, day panel right, stacking on
mobile. What changes is the day panel:

```
┌─ Wed 20 August ──────────────┐
│ revise CAP + PACELC          │   ← free text, autosaving
│                              │
│ ☑ finish sharding notes      │   ← "- " lines become checkboxes
│ ☐ redo rate limiter LLD      │
│                              │
│ ── linked ──                 │   ← read-only
│ ✓ CAP Theorem                │
│ ↻ Sharding          due      │
└──────────────────────────────┘
```

- The editor is a plain `<textarea>` in edit mode and a rendered list in read mode; clicking the
  rendered text enters edit mode with the caret placed at the click. Autosaves on blur and on a
  400ms idle debounce, matching how `TopicDrawer` notes already behave.
- Ticking a checkbox writes to `checked` and does not touch `text`.
- Month cells show a small dot when a day has a note, alongside the existing activity shading —
  so the grid shows both what you did and what you planned.
- Streak framing is removed: no current/best tiles, no fire, no outlined run. Day shading from
  `history` stays (D1), and the consistency figure stays as a neutral month statistic.

## 10. Rewards page

One centred panel: a leaf mark, "Finish a sprint, plant a real tree", one sentence explaining
that each completed sprint will plant one tree, and a quiet "in the works" marker. No fake
counter, no progress bar toward a reward that does not exist yet.

## 11. Visual direction

The refresh from the previous cycle stays — radius scale, fluid display numerals, reduced glow,
spring motion behind `prefers-reduced-motion`. This cycle removes rather than restyles, with
three additions:

- **More air.** Section rhythm loosens now that there is less on each page; the Base page is
  deliberately mostly empty.
- **One accent per page.** The sprint accent already drives sprint pages; Base uses the XP gold,
  Calendar uses the activity green, Rewards uses a leaf green. No page carries four accent
  colours at once.
- **Smoother transitions.** View changes fade rather than cut, at the existing `--dur` token.

---

## 12. Phases

Each phase leaves the app working and is independently reviewable.

| Phase | Content |
|---|---|
| **1 — Strip** | Remove Quests, Awards, Guide, streaks and dashboard furniture. Data model and migration. App runs with a reduced but unstyled-for-it nav. |
| **2 — Navigate** | Sidebar dropdown, five destinations, top bar reduction, mobile bar, Rewards page. |
| **3 — Base** | Rebuild the Base page as level + pick up. |
| **4 — Day notes** | `dayNotes` editor, `remapChecked`, month-cell note dots. The only new feature. |
| **5 — Polish** | Minimal visual pass, transitions, both themes, mobile widths. |

Phases 1–2 are sequential. Phase 3 and Phase 4 are independent of each other once Phase 2 lands
and may be built in parallel. Phase 5 runs last.

## 13. Verification

Manual, consistent with the previous cycle's decision not to add a test runner.

- **V1 — data survival.** A save from the current version loads with topics, statuses, notes,
  revision counts, history and level unchanged. `today` / `seenAchievements` dropped silently.
  A backup exported before this change imports cleanly.
- **V2 — level stability.** `tracker.level()` returns identical values before and after the
  Quests removal, on the same save. This is the §4.1 claim, checked rather than assumed.
- **V3 — day notes.** Text round-trips through reload. Ticking persists. `remapChecked` holds
  when a line is inserted above a ticked line, when a ticked line is deleted, and when text is
  edited without changing line count.
- **V4 — navigation.** Five destinations reachable; sprint dropdown expands, collapses, persists,
  and auto-expands on a sprint view; `1`–`5` and `[` / `]` behave; mobile bar shows five items.
- **V5 — build and layout.** `npm run build` passes; every `src/` file under 800 lines; all pages
  checked in both themes at 390px, 768px and 1440px.

## 14. Success criteria

1. Five navigation destinations; Quests, Awards and Guide are gone.
2. An existing save opens with identical topics, statuses, notes and level.
3. Base shows a level and at most five next topics, nothing else.
4. A day note survives a reload, and its checkboxes tick independently of its text.
5. No streak counter appears anywhere; calendar day shading still works.
6. `npm run build` passes; both themes complete at all three widths.
