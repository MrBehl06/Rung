import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ViewId } from './types';
import { VIEWS } from './types';
import { store } from './lib/store';
import { SPRINTS } from './data/sprints';
import { monthGrid } from './lib/calendar';
import { dismissToast, toast, toastStore } from './lib/toasts';
import { computeStats, suggestNext } from './lib/stats';
import { findCategory, matchTopic, runCommand } from './lib/commands';
import { levelInfo } from './lib/game';
import { reviewBuckets } from './lib/srs';
import { PERSISTENT } from './lib/storage';
import { IconSprite } from './components/Icons';
import { MobileNav, Sidebar, navItems } from './components/Sidebar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { TopicModal } from './components/TopicModal';
import { TopicDrawer } from './components/TopicDrawer';
import { Palette } from './components/Palette';
import { Dashboard } from './views/Dashboard';
import { Sprints } from './views/Sprints';
import { Calendar } from './views/Calendar';
import { TopicsView } from './views/TopicsView';
import { Revision } from './views/Revision';
import { Rewards } from './views/Rewards';

export default function App() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);

  const stats = useMemo(() => computeStats(state), [state]);
  const lv = useMemo(() => levelInfo(state), [state]);
  const buckets = useMemo(() => reviewBuckets(state), [state]);

  const [modal, setModal] = useState<{ id: string | null } | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const view = state.ui.view;
  const collapsed = state.ui.sidebar === 'collapsed';
  const anyOverlay = modal !== null || paletteOpen || drawerId !== null;

  const dueCount = buckets.due.length + buckets.flagged.length;
  const items = navItems(dueCount);

  // ---- level-up announcement ----
  const prevLevel = useRef(lv.level);
  useEffect(() => {
    if (lv.level > prevLevel.current) toast(`LEVEL UP — ${lv.level} · ${lv.rank}`, 'ok', 3600);
    prevLevel.current = lv.level;
  }, [lv.level, lv.rank]);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = !!el && /^(input|textarea|select)$/i.test(el.tagName);
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (store.undo()) toast('Undone', 'ok');
        return;
      }
      if (e.key === 'Escape') {
        setModal(null);
        setPaletteOpen(false);
        setDrawerId(null);
        return;
      }
      if (typing || anyOverlay) return;

      if (e.key === '/') {
        e.preventDefault();
        if (view !== 'sprint') store.switchView('sprint');
        setTimeout(() => document.getElementById('fq')?.focus(), 40);
      } else if (e.key === '[' || e.key === ']') {
        // cycle between joined sprints without leaving the topics view
        const ids = state.joinedSprints;
        if (view !== 'sprint' || ids.length < 2) return;
        e.preventDefault();
        const i = ids.indexOf(state.ui.activeSprint ?? ids[0]);
        const next = e.key === ']' ? (i + 1) % ids.length : (i - 1 + ids.length) % ids.length;
        store.openSprint(ids[next]);
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setModal({ id: null });
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        store.toggleSidebar();
      } else if (/^[1-5]$/.test(e.key)) {
        store.switchView(VIEWS[Number(e.key) - 1]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, anyOverlay, state.joinedSprints, state.ui.activeSprint]);

  // ---- boot notices ----
  useEffect(() => {
    const n = store.seedsAdded;
    if (!PERSISTENT) {
      const id = setTimeout(
        () => toast('Storage is blocked here — open the deployed site directly to save progress', 'warn', 6000),
        500,
      );
      return () => clearTimeout(id);
    }
    if (n && store.getSnapshot().topics.length > n) {
      const id = setTimeout(() => toast(`${n} new topic${n > 1 ? 's' : ''} added from the catalogue`, 'ok'), 400);
      return () => clearTimeout(id);
    }
  }, []);

  // ---- console / agent API ----
  useEffect(() => {
    const pick = (q: string) => matchTopic(q).hit;
    (window as unknown as { tracker: unknown }).tracker = {
      run: (input: string) => runCommand(input, (id) => setDrawerId(id)),
      stats: () => computeStats(store.getSnapshot()),
      level: () => levelInfo(store.getSnapshot()),
      reviews: () => reviewBuckets(store.getSnapshot()),
      sprints: () => ({
        registered: SPRINTS.map((s) => ({ id: s.id, name: s.name })),
        joined: store.getSnapshot().joinedSprints,
      }),
      join: (id: string) => store.joinSprint(id),
      leave: (id: string) => store.leaveSprint(id),
      calendar: (year = new Date().getFullYear(), month = new Date().getMonth()) =>
        monthGrid(store.getSnapshot(), year, month),
      next: (n = 5) => suggestNext(store.getSnapshot(), n),
      notes: () => store.getSnapshot().dayNotes,
      note: (date: string, text: string) => store.setDayNote(date, text),
      topics: () => store.getSnapshot().topics,
      data: () => store.getSnapshot(),
      find: pick,
      undo: () => store.undo(),
      complete: (q: string) => { const t = pick(q); return t ? store.complete(t.id) : null; },
      start: (q: string) => { const t = pick(q); return t ? store.start(t.id) : null; },
      revise: (q: string) => { const t = pick(q); return t ? store.needsRevision(t.id) : null; },
      revised: (q: string) => { const t = pick(q); return t ? store.markRevised(t.id) : null; },
      review: (q: string, outcome: 'good' | 'hard' = 'good') => { const t = pick(q); return t ? store.review(t.id, outcome) : null; },
      reset: (q: string) => { const t = pick(q); return t ? store.reset(t.id) : null; },
      remove: (q: string) => { const t = pick(q); return t ? store.deleteTopic(t.id) : null; },
      add: (o: Parameters<typeof store.addTopic>[0]) => store.addTopic(o),
      update: (id: string, patch: Parameters<typeof store.updateTopic>[1]) => store.updateTopic(id, patch),
      move: (q: string, cat: string) => {
        const t = pick(q);
        const f = findCategory(cat);
        return t && f ? store.moveTopic(t.id, f.sprint, f.cat) : null;
      },
      export: () => store.exportData(),
      wipe: () => store.wipe(),
      storage: PERSISTENT ? 'localStorage' : 'memory',
    };
  }, []);

  const editingTopic = modal?.id ? (state.topics.find((t) => t.id === modal.id) ?? null) : null;
  const drawerTopic = drawerId ? (state.topics.find((t) => t.id === drawerId) ?? null) : null;

  const openDrawer = (id: string) => setDrawerId(id);
  const openEdit = (id: string) => {
    setDrawerId(null);
    setModal({ id });
  };
  const go = (v: ViewId) => store.switchView(v);

  return (
    <div className={`shell ${collapsed ? 'rail' : ''}`}>
      <IconSprite />

      <Sidebar
        state={state}
        stats={stats}
        lv={lv}
        items={items}
        collapsed={collapsed}
        onNavigate={go}
        onExport={() => store.exportData()}
        onImport={() => fileRef.current?.click()}
      />

      <div className="main-col">
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


        <main>
          {view === 'dashboard' && (
            <Dashboard
              state={state}
              onOpen={openDrawer}
              onGo={go}
              onExport={() => store.exportData()}
              onImport={() => fileRef.current?.click()}
            />
          )}
          {view === 'sprints' && <Sprints state={state} onNew={() => setModal({ id: null })} />}
          {view === 'sprint' && (
            <TopicsView
              sprintId={state.ui.activeSprint ?? state.joinedSprints[0] ?? 'hld'}
              state={state}
              onOpen={openDrawer}
              onEdit={openEdit}
              onNew={() => setModal({ id: null })}
            />
          )}
          {view === 'calendar' && <Calendar state={state} onOpen={openDrawer} />}
          {view === 'rewards' && <Rewards />}
          {view === 'revision' && <Revision state={state} onOpen={openDrawer} />}
        </main>

        <MobileNav items={items} view={view} onNavigate={go} />
      </div>

      {drawerTopic ? (
        <TopicDrawer topic={drawerTopic} onClose={() => setDrawerId(null)} onEdit={openEdit} />
      ) : null}
      {modal !== null && <TopicModal editing={editingTopic} state={state} onClose={() => setModal(null)} />}
      {paletteOpen && <Palette onClose={() => setPaletteOpen(false)} onOpenTopic={openDrawer} />}
      <ConfirmDialog />

      <div id="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div className={`toast ${t.kind}`} key={t.id}>
            <span className="ln">{t.msg}</span>
            {t.action ? (
              <button
                className="btn xs"
                onClick={() => {
                  t.action?.run();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
