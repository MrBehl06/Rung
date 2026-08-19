import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ViewId } from './types';
import { VIEWS } from './types';
import { store } from './lib/store';
import { dismissToast, toast, toastStore } from './lib/toasts';
import { computeStats, completionStreak, suggestNext } from './lib/stats';
import { findCategory, matchTopic, runCommand } from './lib/commands';
import { achievements, levelInfo, questState } from './lib/game';
import type { Achievement } from './lib/game';
import { reviewBuckets } from './lib/srs';
import { PERSISTENT } from './lib/storage';
import { Icon, IconSprite } from './components/Icons';
import { UnlockToast } from './components/hud';
import { MobileNav, Sidebar, navItems } from './components/Sidebar';
import { ConfirmDialog } from './components/ConfirmDialog';
import { TopicModal } from './components/TopicModal';
import { TopicDrawer } from './components/TopicDrawer';
import { Palette } from './components/Palette';
import { Dashboard } from './views/Dashboard';
import { TopicsView } from './views/TopicsView';
import { Today } from './views/Today';
import { Revision } from './views/Revision';
import { Awards } from './views/Awards';
import { Guide } from './views/Guide';

export default function App() {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot);

  const stats = useMemo(() => computeStats(state), [state]);
  const lv = useMemo(() => levelInfo(state), [state]);
  const ach = useMemo(() => achievements(state), [state]);
  const quests = useMemo(() => questState(state), [state]);
  const buckets = useMemo(() => reviewBuckets(state), [state]);
  const streak = useMemo(() => completionStreak(state), [state]);

  const [modal, setModal] = useState<{ id: string | null } | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<Achievement[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const view = state.ui.view;
  const collapsed = state.ui.sidebar === 'collapsed';
  const anyOverlay = modal !== null || paletteOpen || drawerId !== null || mobileNavOpen;

  const dueCount = buckets.due.length + buckets.flagged.length;
  const unlockedCount = ach.filter((a) => a.unlocked).length;
  const items = navItems(state, stats, unlockedCount, dueCount);

  // ---- celebrate newly unlocked achievements exactly once ----
  const seen = state.seenAchievements;
  useEffect(() => {
    const already = seen ?? [];
    const fresh = ach.filter((a) => a.unlocked && !already.includes(a.id));
    if (!fresh.length) return;
    setUnlockQueue((q) => [...q, ...fresh.filter((f) => !q.some((x) => x.id === f.id))]);
    store.markAchievementsSeen(fresh.map((a) => a.id));
  }, [ach, seen]);

  useEffect(() => {
    if (!unlockQueue.length) return;
    const id = setTimeout(() => setUnlockQueue((q) => q.slice(1)), 2800);
    return () => clearTimeout(id);
  }, [unlockQueue]);

  const unlock = unlockQueue[0] ?? null;

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
        setMobileNavOpen(false);
        return;
      }
      if (typing || anyOverlay) return;

      if (e.key === '/') {
        e.preventDefault();
        if (view !== 'hld' && view !== 'lld') store.switchView('hld');
        setTimeout(() => document.getElementById('fq')?.focus(), 40);
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setModal({ id: null });
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        store.toggleSidebar();
      } else if (/^[1-7]$/.test(e.key)) {
        store.switchView(VIEWS[Number(e.key) - 1]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, anyOverlay]);

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
      awards: () => achievements(store.getSnapshot()),
      streak: () => completionStreak(store.getSnapshot()),
      reviews: () => reviewBuckets(store.getSnapshot()),
      next: (n = 5) => suggestNext(store.getSnapshot(), n),
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
        return t && f ? store.moveTopic(t.id, f.type, f.cat) : null;
      },
      today: {
        add: (q: string) => { const t = pick(q); return store.addToday(t ? t.id : q); },
        list: () => store.getSnapshot().today,
        carry: () => store.carryToTomorrow(),
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
  const go = (v: ViewId) => {
    store.switchView(v);
    setMobileNavOpen(false);
  };

  return (
    <div className={`shell ${collapsed ? 'rail' : ''}`}>
      <IconSprite />

      <Sidebar
        state={state}
        lv={lv}
        streak={streak}
        items={items}
        collapsed={collapsed}
        onNavigate={go}
        onExport={() => store.exportData()}
        onImport={() => fileRef.current?.click()}
      />

      <div className="main-col">
        <header className="topbar">
          <button
            className="btn ghost icon-btn only-mobile"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <span aria-hidden="true">☰</span>
          </button>

          <button className="omni" onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={14} />
            <span>Jump to a topic or run a command</span>
            <span className="kbd">⌘K</span>
          </button>

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

        <main>
          {view === 'dashboard' && <Dashboard state={state} stats={stats} onEdit={openEdit} onOpen={openDrawer} onGo={go} />}
          {view === 'hld' && <TopicsView scope="HLD" state={state} onOpen={openDrawer} onEdit={openEdit} />}
          {view === 'lld' && <TopicsView scope="LLD" state={state} onOpen={openDrawer} onEdit={openEdit} />}
          {view === 'today' && <Today state={state} onEdit={openEdit} onOpen={openDrawer} />}
          {view === 'revision' && <Revision state={state} onOpen={openDrawer} />}
          {view === 'awards' && <Awards state={state} />}
          {view === 'guide' && <Guide state={state} stats={stats} quests={quests} onImport={() => fileRef.current?.click()} />}
        </main>

        <MobileNav items={items} view={view} onNavigate={go} onMore={() => setMobileNavOpen(true)} />
      </div>

      {/* mobile drawer holding the full sidebar */}
      {mobileNavOpen ? (
        <div className="mdrawer-ovl" onClick={(e) => e.target === e.currentTarget && setMobileNavOpen(false)}>
          <div className="mdrawer">
            <Sidebar
              state={state}
              lv={lv}
              streak={streak}
              items={items}
              collapsed={false}
              inDrawer
              onNavigate={go}
              onExport={() => { store.exportData(); setMobileNavOpen(false); }}
              onImport={() => { fileRef.current?.click(); setMobileNavOpen(false); }}
            />
          </div>
        </div>
      ) : null}

      {drawerTopic ? (
        <TopicDrawer topic={drawerTopic} onClose={() => setDrawerId(null)} onEdit={openEdit} />
      ) : null}
      {modal !== null && <TopicModal editing={editingTopic} state={state} onClose={() => setModal(null)} />}
      {paletteOpen && <Palette onClose={() => setPaletteOpen(false)} onOpenTopic={openDrawer} />}
      {unlock ? <UnlockToast a={unlock} /> : null}
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
