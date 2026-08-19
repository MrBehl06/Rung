import { useEffect, useMemo, useState } from 'react';
import type { Difficulty, SortKey, Status, Topic, TopicType, TrackerState } from '../types';
import { DIFFS, STATUSES, TYPES } from '../types';
import { CATS } from '../data/seed';
import { statsFor } from '../lib/stats';
import { skillTree, xpFor } from '../lib/game';
import { store } from '../lib/store';
import { confirmDialog } from '../lib/dialog';
import { norm, slug } from '../lib/utils';
import { Icon } from '../components/Icons';
import { Empty, Meter, SHead, SkillTree, Tile } from '../components/hud';
import { TopicRow } from '../components/TopicRow';

const DIFF_RANK: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'default', label: 'Catalogue order' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'difficulty', label: 'Difficulty' },
  { id: 'xp', label: 'XP value' },
  { id: 'recent', label: 'Recently touched' },
];

function sortTopics(list: Topic[], sort: SortKey): Topic[] {
  const out = [...list];
  switch (sort) {
    case 'name':
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case 'difficulty':
      return out.sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty] || a.name.localeCompare(b.name));
    case 'xp':
      return out.sort((a, b) => xpFor(b) - xpFor(a) || a.name.localeCompare(b.name));
    case 'recent':
      return out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    default:
      return out.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  }
}

function allCategories(state: TrackerState, typeFilter: TopicType | 'all'): string[] {
  const set: string[] = [];
  for (const type of TYPES) {
    if (typeFilter !== 'all' && typeFilter !== type) continue;
    for (const c of CATS[type]) if (!set.includes(c)) set.push(c);
  }
  for (const t of state.topics) {
    if (typeFilter !== 'all' && t.type !== typeFilter) continue;
    if (!set.includes(t.category)) set.push(t.category);
  }
  return set;
}

export function TopicsView({
  scope,
  state,
  onOpen,
  onEdit,
}: {
  scope: TopicType;
  state: TrackerState;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const f = state.ui.filters;
  const sort = state.ui.sort ?? 'default';
  const q = norm(f.q);
  const accent = scope === 'LLD' ? 'lld' : 'hld';

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState(0);

  const list = useMemo(
    () =>
      state.topics.filter((t) => {
        if (f.type !== 'all' && t.type !== f.type) return false;
        if (f.category !== 'all' && t.category !== f.category) return false;
        if (f.status !== 'all' && t.status !== f.status) return false;
        if (f.difficulty !== 'all' && t.difficulty !== f.difficulty) return false;
        if (q && !(norm(t.name).includes(q) || norm(t.category).includes(q) || norm(t.notes).includes(q)))
          return false;
        return true;
      }),
    [state.topics, f.type, f.category, f.status, f.difficulty, q],
  );

  const scoped = state.topics.filter((t) => t.type === scope);
  const s = statsFor(scoped);
  const xpEarned = scoped.filter((t) => t.status === 'Completed').reduce((n, t) => n + xpFor(t), 0);
  const xpTotal = scoped.reduce((n, t) => n + xpFor(t), 0);
  const tree = skillTree(state, scope, CATS[scope]);
  const cats = allCategories(state, f.type);

  // grouped when in catalogue order, flat when explicitly sorted
  const grouped = sort === 'default';
  const flat = useMemo(() => sortTopics(list, sort), [list, sort]);
  const groups = useMemo(
    () =>
      cats
        .map((cat) => [cat, sortTopics(list.filter((t) => t.category === cat), 'default')] as const)
        .filter(([, items]) => items.length),
    [cats, list],
  );

  /** the visible order, used by j/k and select-all */
  const ordered = grouped ? groups.flatMap(([, items]) => items) : flat;

  useEffect(() => setCursor(0), [f.q, f.category, f.status, f.difficulty, sort, scope]);

  // j/k row navigation — only when not typing and no overlay is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(input|textarea|select)$/i.test(el.tagName)) return;
      if (document.querySelector('.ovl, .drawer-ovl')) return;
      const k = e.key.toLowerCase();
      if (k !== 'j' && k !== 'k' && e.key !== 'Enter' && e.key !== 'x') return;
      if (!ordered.length) return;

      if (k === 'j') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, ordered.length - 1));
      } else if (k === 'k') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const t = ordered[cursor];
        if (t) onOpen(t.id);
      } else if (e.key === 'x') {
        e.preventDefault();
        const t = ordered[cursor];
        if (!t) return;
        setPicked((p) => {
          const n = new Set(p);
          if (n.has(t.id)) n.delete(t.id);
          else n.add(t.id);
          return n;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ordered, cursor, onOpen]);

  // keep the cursor row in view
  useEffect(() => {
    const t = ordered[cursor];
    if (!t) return;
    document.querySelector(`[data-tid="${t.id}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor, ordered]);

  const filtersActive =
    f.q !== '' || f.category !== 'all' || f.status !== 'all' || f.difficulty !== 'all';
  const pickedIds = [...picked];

  function toggle(id: string) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const rowProps = (t: Topic, i: number) => ({
    topic: t,
    onOpen,
    onEdit,
    selected: picked.has(t.id),
    onSelect: () => toggle(t.id),
    active: ordered[cursor]?.id === t.id,
    index: i,
  });

  return (
    <section className="view">
      <div className="bento">
        <div className="c3">
          <Tile
            k={`${scope} mastery`}
            v={`${s.pct}%`}
            m={`${s.done}/${s.total} cleared`}
            cls={accent}
            p={s.pct}
            icon={scope === 'HLD' ? '🏗' : '🔬'}
          />
        </div>
        <div className="c3">
          <Tile k="XP earned" v={xpEarned} m={`of ${xpTotal} available`} cls="xp" p={(xpEarned / (xpTotal || 1)) * 100} icon="⚡" />
        </div>
        <div className="c3">
          <Tile k="Active" v={s.prog} m="in progress" cls="hld" icon="▶" />
        </div>
        <div className="c3">
          <Tile k="To revise" v={s.rev} m={s.rev ? 'in the review queue' : 'queue clear'} cls="warn" icon="↻" />
        </div>
      </div>

      <div className="bento">
        <div className="c4">
          <div className="panel rail pad" style={{ height: '100%', ['--rail' as string]: `var(--${accent})` }}>
            <SHead title={`${scope} path`} />
            <SkillTree
              nodes={tree}
              onPick={(cat) => store.setFilters({ category: f.category === cat ? 'all' : cat })}
            />
          </div>
        </div>

        <div className="c8">
          <div className="toolbar">
            <span className="search">
              <Icon name="search" />
              <input
                type="search"
                id="fq"
                placeholder="Search names, tracks, notes…"
                value={f.q}
                autoComplete="off"
                spellCheck={false}
                aria-label="Search topics"
                onChange={(e) => store.setFilters({ q: e.target.value }, 'soon')}
              />
            </span>

            <select className="f" aria-label="Category filter" value={f.category} onChange={(e) => store.setFilters({ category: e.target.value })}>
              <option value="all">All tracks</option>
              {cats.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select className="f" aria-label="Status filter" value={f.status} onChange={(e) => store.setFilters({ status: e.target.value as Status | 'all' })}>
              <option value="all">Any status</option>
              {STATUSES.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>

            <select className="f" aria-label="Difficulty filter" value={f.difficulty} onChange={(e) => store.setFilters({ difficulty: e.target.value as Difficulty | 'all' })}>
              <option value="all">Any difficulty</option>
              {DIFFS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select className="f" aria-label="Sort" value={sort} onChange={(e) => store.setSort(e.target.value as SortKey)}>
              {SORTS.map((x) => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>

            {filtersActive ? (
              <button className="btn ghost" onClick={() => store.clearFilters()}>
                <Icon name="x" size={12} />
                Clear
              </button>
            ) : null}
          </div>

          <div className="row wrap" style={{ margin: '-2px 0 11px' }}>
            <span className="count-note">
              {list.length} shown · {scoped.length} in {scope}
            </span>
            <span className="count-note dim" style={{ marginLeft: 12 }}>
              j/k move · enter open · x select
            </span>
            <span className="spacer" />
            <button
              className="btn xs ghost"
              onClick={() =>
                setPicked((p) => (p.size === ordered.length ? new Set() : new Set(ordered.map((t) => t.id))))
              }
            >
              {picked.size === ordered.length && ordered.length ? 'Deselect all' : 'Select all'}
            </button>
            {grouped ? (
              <>
                <button className="btn xs ghost" onClick={() => store.setAllCollapsed(cats.map(slug), false)}>
                  Expand
                </button>
                <button className="btn xs ghost" onClick={() => store.setAllCollapsed(cats.map(slug), true)}>
                  Collapse
                </button>
              </>
            ) : null}
          </div>

          {ordered.length === 0 ? (
            <div className="panel">
              <Empty icon="🔍" title="No matches" msg="Nothing matches these filters. Try clearing the search." />
            </div>
          ) : grouped ? (
            groups.map(([cat, items]) => {
              const cs = statsFor(state.topics.filter((t) => t.category === cat && (f.type === 'all' || t.type === f.type)));
              const key = slug(cat);
              const open = state.ui.collapsed[key] !== true;
              const mastered = cs.total > 0 && cs.done === cs.total;
              return (
                <div className="panel cat-block" key={cat}>
                  <button className="cat-head" aria-expanded={open} onClick={() => store.toggleCollapsed(key)}>
                    <span className="caret"><Icon name="caret" /></span>
                    <h3>
                      {cat}
                      {mastered ? <span className="mastered" aria-label="mastered">★</span> : null}
                    </h3>
                    <span className="mini"><Meter p={cs.pct} cls={mastered ? 'ok' : accent} seg /></span>
                    <span className="cnt">{cs.done}/{cs.total}</span>
                  </button>
                  {open ? (
                    <div className="tlist">
                      {items.map((t) => (
                        <TopicRow key={t.id} {...rowProps(t, ordered.indexOf(t))} />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="panel">
              <div className="tlist">
                {flat.map((t, i) => (
                  <TopicRow key={t.id} {...rowProps(t, i)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* bulk action bar */}
      {picked.size ? (
        <div className="bulk" role="region" aria-label="Bulk actions">
          <span className="bulk-n">{picked.size} selected</span>
          <span className="spacer" />
          <button className="btn xs" onClick={() => { store.bulkStatus(pickedIds, 'Completed'); setPicked(new Set()); }}>
            Complete
          </button>
          <button className="btn xs" onClick={() => { store.bulkStatus(pickedIds, 'In Progress'); setPicked(new Set()); }}>
            Start
          </button>
          <button className="btn xs" onClick={() => { store.bulkStatus(pickedIds, 'Needs Revision'); setPicked(new Set()); }}>
            Revise
          </button>
          <button className="btn xs" onClick={() => { store.bulkStatus(pickedIds, 'Not Started'); setPicked(new Set()); }}>
            Reset
          </button>
          <select
            className="f"
            aria-label="Move selected to track"
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              store.bulkMove(pickedIds, scope, e.target.value);
              setPicked(new Set());
            }}
          >
            <option value="">Move to…</option>
            {CATS[scope].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            className="btn xs danger"
            onClick={async () => {
              const ok = await confirmDialog({
                title: `Delete ${picked.size} topic${picked.size > 1 ? 's' : ''}?`,
                body: 'You can undo this from the toast straight after.',
                confirmLabel: 'Delete',
                danger: true,
              });
              if (ok) {
                store.bulkDelete(pickedIds);
                setPicked(new Set());
              }
            }}
          >
            Delete
          </button>
          <button className="btn xs ghost" onClick={() => setPicked(new Set())}>
            <Icon name="x" size={12} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
