import type {
  Filters,
  SortKey,
  Status,
  Topic,
  TrackerState,
  ViewId,
} from '../types';
import { STATUSES } from '../types';
import { SPRINTS, categoriesOf, getSprint, resolveSprint } from '../data/sprints';
import { KEY, PERSISTENT, Storage } from './storage';
import { blankState, loadState, makeTopic } from './model';
import { SR_STEPS, addDays, stepDays } from './srs';
import { remapChecked, toggleLine } from './daynotes';
import { domainOf, nowISO, safeUrl, todayISO, uid } from './utils';
import { toast, toastUndo } from './toasts';
import { confirmDialog } from './dialog';

type Listener = () => void;

class TrackerStore {
  private state: TrackerState = blankState();
  private listeners = new Set<Listener>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingWrite = false;
  /** snapshots for undo of destructive actions, newest last */
  private undoStack: TrackerState[] = [];
  /** how many catalogue rows got merged in on boot */
  seedsAdded = 0;

  constructor() {
    const { state, added } = loadState();
    this.state = state;
    this.seedsAdded = added;
    if (added) this.writeNow();
    this.applyTheme(this.state.ui.theme);
    this.wireWindow();
  }

  // ---------- subscription ----------
  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): TrackerState => this.state;

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  // ---------- persistence ----------
  /**
   * Data changes write synchronously — a debounce here would lose the last
   * change if the tab closes right after it. Only cosmetic UI state (search
   * text, collapsed sections) is deferred, and that is flushed on
   * pagehide/visibilitychange so nothing escapes.
   */
  private writeNow(): void {
    this.pendingWrite = false;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    try {
      Storage.set(KEY, JSON.stringify(this.state));
    } catch (e) {
      toast('Could not save — storage full or blocked', 'err');
      console.error('[tracker] save failed', e);
    }
  }

  private writeSoon(): void {
    this.pendingWrite = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.writeNow(), 250);
  }

  private wireWindow(): void {
    window.addEventListener('pagehide', () => {
      if (this.pendingWrite) this.writeNow();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.pendingWrite) this.writeNow();
    });
    if (!PERSISTENT) return;
    // keep multiple tabs of the hosted app in sync
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const incoming = JSON.parse(e.newValue) as Partial<TrackerState>;
        if (!incoming || !Array.isArray(incoming.topics)) return;
        this.state = { ...blankState(), ...incoming, topics: incoming.topics.map(makeTopic) };
        this.applyTheme(this.state.ui.theme);
        this.emit();
        toast('Synced changes from another tab');
      } catch {
        /* ignore a malformed write from another tab */
      }
    });
  }

  /** Clone the slices a mutation can touch, apply it, then publish. */
  private produce(fn: (draft: TrackerState) => void, persist: 'now' | 'soon' = 'now'): void {
    const draft: TrackerState = {
      ...this.state,
      topics: this.state.topics.map((t) => ({ ...t })),
      history: { ...this.state.history },
      removedSeeds: [...this.state.removedSeeds],
      dayNotes: { ...this.state.dayNotes },
      joinedSprints: [...this.state.joinedSprints],
      ui: {
        ...this.state.ui,
        collapsed: { ...this.state.ui.collapsed },
        filters: { ...this.state.ui.filters },
      },
    };
    fn(draft);
    draft.updatedAt = nowISO();
    this.state = draft;
    if (persist === 'now') this.writeNow();
    else this.writeSoon();
    this.emit();
  }

  // ---------- undo ----------
  /** capture the current state so the next destructive action can be reversed */
  private checkpoint(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.state)) as TrackerState);
    if (this.undoStack.length > 10) this.undoStack.shift();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  undo(): boolean {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.state = prev;
    this.writeNow();
    this.applyTheme(this.state.ui.theme);
    this.emit();
    return true;
  }

  // ---------- lookups ----------
  find = (id: string): Topic | undefined => this.state.topics.find((t) => t.id === id);

  private bumpHistory(draft: TrackerState, delta: number): void {
    const d = todayISO();
    draft.history[d] = Math.max(0, (draft.history[d] || 0) + delta);
    if (!draft.history[d]) delete draft.history[d];
  }

  // ---------- topic mutations ----------
  setStatus(id: string, status: Status): Topic | null {
    if (!STATUSES.includes(status)) return null;
    let result: Topic | null = null;
    this.produce((d) => {
      const t = d.topics.find((x) => x.id === id);
      if (!t) return;
      const prev = t.status;
      result = t;
      if (prev === status) return;

      t.status = status;
      t.updatedAt = nowISO();

      if (status === 'In Progress' && !t.dateStarted) t.dateStarted = todayISO();
      if (status === 'Completed') {
        if (!t.dateStarted) t.dateStarted = todayISO();
        t.dateCompleted = todayISO();
        if (prev === 'Needs Revision') t.revisionCount += 1; // revised, then re-completed
        if (prev !== 'Completed') this.bumpHistory(d, 1);
        // first completion schedules the first review
        if (t.srStep == null) t.srStep = 0;
        t.srDue = addDays(todayISO(), stepDays(t.srStep));
      }
      if (status === 'Needs Revision') {
        if (!t.dateCompleted) t.dateCompleted = todayISO();
        // struggling drops back to the start of the ladder, due tomorrow
        t.srStep = 0;
        t.srDue = addDays(todayISO(), stepDays(0));
      }
      if (prev === 'Completed' && status !== 'Completed') this.bumpHistory(d, -1);
      if (status === 'Not Started') {
        t.dateStarted = null;
        t.dateCompleted = null;
        t.srStep = undefined;
        t.srDue = null;
      }
    });
    return result;
  }

  complete = (id: string) => this.setStatus(id, 'Completed');
  start = (id: string) => this.setStatus(id, 'In Progress');
  reset = (id: string) => this.setStatus(id, 'Not Started');
  needsRevision = (id: string) => this.setStatus(id, 'Needs Revision');

  toggleComplete(id: string): void {
    const t = this.find(id);
    if (!t) return;
    this.setStatus(id, t.status === 'Completed' ? 'In Progress' : 'Completed');
  }

  /**
   * Log a review. A clean recall walks up the spaced-repetition ladder;
   * a struggle drops back to the first step and re-queues for tomorrow.
   */
  review(id: string, outcome: 'good' | 'hard'): Topic | null {
    let result: Topic | null = null;
    this.produce((d) => {
      const t = d.topics.find((x) => x.id === id);
      if (!t) return;
      const wasCompleted = t.status === 'Completed';
      t.revisionCount += 1;
      t.lastRevisedAt = todayISO();
      t.updatedAt = nowISO();

      if (outcome === 'good') {
        t.srStep = Math.min((t.srStep ?? 0) + 1, SR_STEPS.length - 1);
        t.status = 'Completed';
        t.dateCompleted = todayISO();
        if (!wasCompleted) this.bumpHistory(d, 1);
      } else {
        t.srStep = 0;
        t.status = 'Needs Revision';
        if (wasCompleted) this.bumpHistory(d, -1);
      }
      t.srDue = addDays(todayISO(), stepDays(t.srStep));
      result = t;
    });
    return result;
  }

  /** kept for the command engine + console API: "revised X" is a clean recall */
  markRevised(id: string): Topic | null {
    return this.review(id, 'good');
  }

  /** push a review out without logging a pass */
  snooze(id: string, days: number): void {
    this.produce((d) => {
      const t = d.topics.find((x) => x.id === id);
      if (!t) return;
      t.srDue = addDays(todayISO(), days);
      t.updatedAt = nowISO();
    });
  }

  addTopic(data: Partial<Topic> & { name?: string }): Topic | null {
    const t = makeTopic({ order: this.state.topics.length, ...data });
    if (!t.name) return null;
    this.produce((d) => {
      d.topics.push(t);
      if (t.status === 'Completed') this.bumpHistory(d, 1);
    });
    return t;
  }

  updateTopic(id: string, patch: Partial<Topic>): Topic | null {
    let result: Topic | null = null;
    this.produce((d) => {
      const t = d.topics.find((x) => x.id === id);
      if (!t) return;
      const prevStatus = t.status;
      Object.assign(t, patch, { updatedAt: nowISO() });
      t.sprint = resolveSprint(t.sprint);
      if (!categoriesOf(t.sprint).includes(t.category) && !patch.category)
        t.category = categoriesOf(t.sprint)[0];
      if (!STATUSES.includes(t.status)) t.status = 'Not Started';
      if (prevStatus !== t.status) {
        if (t.status === 'Completed') {
          t.dateCompleted = t.dateCompleted || todayISO();
          this.bumpHistory(d, 1);
        }
        if (prevStatus === 'Completed') this.bumpHistory(d, -1);
        if (t.status === 'In Progress' && !t.dateStarted) t.dateStarted = todayISO();
        if (t.status === 'Not Started') {
          t.dateStarted = null;
          t.dateCompleted = null;
        }
      }
      result = t;
    });
    return result;
  }

  deleteTopic(id: string, opts: { undo?: boolean } = {}): Topic | null {
    const existing = this.find(id);
    if (!existing) return null;
    this.checkpoint();
    this.produce((d) => {
      const i = d.topics.findIndex((t) => t.id === id);
      if (i < 0) return;
      const [t] = d.topics.splice(i, 1);
      // don't resurrect a deleted catalogue row on the next load
      if (t.sid && !d.removedSeeds.includes(t.sid)) d.removedSeeds.push(t.sid);
      if (t.status === 'Completed') this.bumpHistory(d, -1);
    });
    if (opts.undo !== false) {
      toastUndo(`Deleted “${existing.name}”`, () => this.undo());
    }
    return existing;
  }

  // ---------- bulk ----------
  bulkStatus(ids: string[], status: Status): void {
    if (!ids.length) return;
    this.checkpoint();
    for (const id of ids) this.setStatus(id, status);
    toastUndo(`${ids.length} topic${ids.length > 1 ? 's' : ''} → ${status}`, () => this.undo(), 'ok');
  }

  bulkMove(ids: string[], sprintId: string, category: string): void {
    if (!ids.length) return;
    this.checkpoint();
    this.produce((d) => {
      for (const id of ids) {
        const t = d.topics.find((x) => x.id === id);
        if (!t) continue;
        t.sprint = resolveSprint(sprintId);
        t.category = categoriesOf(t.sprint).includes(category) ? category : categoriesOf(t.sprint)[0];
        t.updatedAt = nowISO();
      }
    });
    toastUndo(`Moved ${ids.length} to ${category}`, () => this.undo(), 'ok');
  }

  bulkDelete(ids: string[]): void {
    if (!ids.length) return;
    this.checkpoint();
    this.produce((d) => {
      for (const id of ids) {
        const i = d.topics.findIndex((t) => t.id === id);
        if (i < 0) continue;
        const [t] = d.topics.splice(i, 1);
        if (t.sid && !d.removedSeeds.includes(t.sid)) d.removedSeeds.push(t.sid);
        if (t.status === 'Completed') this.bumpHistory(d, -1);
        }
    });
    toastUndo(`Deleted ${ids.length} topic${ids.length > 1 ? 's' : ''}`, () => this.undo());
  }

  moveTopic(id: string, sprintId: string, category: string): Topic | null {
    let result: Topic | null = null;
    this.produce((d) => {
      const t = d.topics.find((x) => x.id === id);
      if (!t) return;
      t.sprint = resolveSprint(sprintId);
      t.category = categoriesOf(t.sprint).includes(category) ? category : categoriesOf(t.sprint)[0];
      t.updatedAt = nowISO();
      result = t;
    });
    return result;
  }

  toggleBookmark(id: string): void {
    this.produce((d) => {
      const t = d.topics.find((x) => x.id === id);
      if (!t) return;
      t.bookmarked = !t.bookmarked;
      t.updatedAt = nowISO();
    });
  }

  // ---------- topic links ----------
  /**
   * Attach a resource to a topic. The URL is validated to http(s) first —
   * a `javascript:` URL rendered into an href would execute.
   * Returns false when the input was not a usable URL.
   */
  addLink(topicId: string, rawUrl: string, label = ''): boolean {
    const url = safeUrl(rawUrl);
    if (!url) {
      toast('That does not look like a web address', 'warn');
      return false;
    }
    if (this.find(topicId)?.links.some((l) => l.url === url)) {
      toast('Already saved on this topic', 'warn');
      return false;
    }
    this.produce((d) => {
      const t = d.topics.find((x) => x.id === topicId);
      if (!t) return;
      t.links = [...t.links, { id: uid(), url, label: label.trim() || domainOf(url) }];
      t.updatedAt = nowISO();
    });
    return true;
  }

  removeLink(topicId: string, linkId: string): void {
    this.produce((d) => {
      const t = d.topics.find((x) => x.id === topicId);
      if (!t) return;
      t.links = t.links.filter((l) => l.id !== linkId);
      t.updatedAt = nowISO();
    });
  }

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

  // ---------- ui ----------
  private applyTheme(theme: 'dark' | 'light'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.applyTheme(theme);
    this.produce((d) => {
      d.ui.theme = theme;
    });
  }

  joinSprint(id: string): void {
    if (!getSprint(id) || this.state.joinedSprints.includes(id)) return;
    this.produce((d) => {
      d.joinedSprints = [...d.joinedSprints, id];
    });
    toast(`Joined ${getSprint(id)?.name}`, 'ok');
  }

  /**
   * Leaving hides a sprint from the sidebar, Quests and Review.
   * Nothing is deleted — XP, awards, streak and every topic stay exactly as
   * they are, so focusing never costs the user a level or a badge.
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

  setFilters(patch: Partial<Filters>, persist: 'now' | 'soon' = 'now'): void {
    this.produce((d) => {
      d.ui.filters = { ...d.ui.filters, ...patch };
    }, persist);
  }

  clearFilters(): void {
    const { view, activeSprint } = this.state.ui;
    this.setFilters({
      q: '',
      sprint: view === 'sprint' && activeSprint ? activeSprint : 'all',
      saved: false,
      category: 'all',
      status: 'all',
      difficulty: 'all',
    });
  }

  toggleCollapsed(key: string): void {
    this.produce((d) => {
      d.ui.collapsed[key] = d.ui.collapsed[key] !== true;
    }, 'soon');
  }

  setAllCollapsed(keys: string[], collapsed: boolean): void {
    this.produce((d) => {
      for (const k of keys) d.ui.collapsed[k] = collapsed;
    });
  }

  /** expand/collapse the sidebar's Sprints group; persisted like other UI state */
  toggleNavGroup(): void {
    this.produce((d) => {
      d.ui.collapsed['nav-sprints'] = d.ui.collapsed['nav-sprints'] !== true;
    }, 'soon');
  }

  toggleSidebar(): void {
    this.produce((d) => {
      d.ui.sidebar = d.ui.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
    }, 'soon');
  }

  setSort(sort: SortKey): void {
    this.produce((d) => {
      d.ui.sort = sort;
    }, 'soon');
  }

  // ---------- backup ----------
  exportData(): void {
    const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rung-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Backup downloaded', 'ok');
  }

  importFile(file: File): void {
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const data = JSON.parse(String(rd.result)) as Partial<TrackerState>;
        if (!data || !Array.isArray(data.topics)) throw new Error('not a tracker backup');
        const ok = await confirmDialog({
          title: `Import ${data.topics.length} topics?`,
          body: 'This replaces your current data. You can undo straight after.',
          confirmLabel: 'Import',
          danger: true,
        });
        if (!ok) return;
        this.checkpoint();
        Storage.set(KEY, JSON.stringify(data));
        const { state } = loadState();
        this.state = state;
        this.writeNow();
        this.applyTheme(this.state.ui.theme);
        this.emit();
        toastUndo(`Imported ${this.state.topics.length} topics`, () => this.undo(), 'ok');
      } catch (e) {
        toast('Import failed: ' + (e as Error).message, 'err', 4200);
      }
    };
    rd.readAsText(file);
  }

  async wipe(): Promise<void> {
    const ok = await confirmDialog({
      title: 'Erase all progress?',
      body: 'Every status, note, quest and streak is cleared and the default catalogue is restored.',
      confirmLabel: 'Erase everything',
      danger: true,
    });
    if (!ok) return;
    this.checkpoint();
    Storage.del(KEY);
    const { state } = loadState(null);
    this.state = state;
    this.writeNow();
    this.applyTheme(this.state.ui.theme);
    this.emit();
    toastUndo('Reset to the default catalogue', () => this.undo());
  }
}

export const store = new TrackerStore();
