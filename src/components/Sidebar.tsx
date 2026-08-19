import type { Stats, TrackerState, ViewId } from '../types';
import type { LevelInfo } from '../lib/game';
import { joinedSprintDefs } from '../lib/scope';
import { store } from '../lib/store';
import { Icon } from './Icons';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  badge?: string;
  hot?: boolean;
  /** set on dynamic sprint rows — routed through openSprint */
  sprintId?: string;
}

export function navItems(state: TrackerState, stats: Stats, unlocked: number, dueCount: number): NavItem[] {
  const openQuests = state.today.items.filter((i) => !i.done).length;
  // one row per joined sprint, so the fixed rows never shift as sprints are added
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

interface Props {
  state: TrackerState;
  lv: LevelInfo;
  streak: number;
  items: NavItem[];
  collapsed: boolean;
  /** rendered inside the mobile drawer rather than as a fixed rail */
  inDrawer?: boolean;
  onNavigate: (v: ViewId) => void;
  onExport: () => void;
  onImport: () => void;
}

export function Sidebar({
  state,
  lv,
  streak,
  items,
  collapsed,
  inDrawer,
  onNavigate,
  onExport,
  onImport,
}: Props) {
  const view = state.ui.view;

  return (
    <aside className={`side ${collapsed && !inDrawer ? 'is-collapsed' : ''} ${inDrawer ? 'in-drawer' : ''}`}>
      <div className="side-brand">
        <span className="logo" aria-hidden="true">&lt;/&gt;</span>
        <span className="side-brand-txt">
          <b>SYSTEM DESIGN</b>
          <small>tracker</small>
        </span>
      </div>

      {/* persistent progression — visible on every view */}
      <div className="side-hud" title={`${lv.xp} XP · ${lv.toNext} to level ${lv.level + 1}`}>
        <div className="side-hud-top">
          <span className="side-lv" aria-hidden="true">{lv.level}</span>
          <span className="side-hud-txt">
            <b>{lv.rank}</b>
            <small>
              {lv.into}/{lv.span} XP
            </small>
          </span>
        </div>
        <span className="side-xp">
          <i style={{ width: `${lv.pct}%` }} />
        </span>
        <div className="side-streak">
          <span>🔥 {streak}d streak</span>
          <span className="spacer" />
          <span>{lv.xp.toLocaleString()} XP</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Main">
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
              <span className="si" aria-hidden="true">{it.icon}</span>
              <span className="sl">{it.label}</span>
              {it.badge != null && it.badge !== '' ? (
                <span className={`sb ${it.hot ? 'hot' : ''}`}>{it.badge}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="side-foot">
        <button className="btn ghost icon-btn" title="Export backup" onClick={onExport}>
          <Icon name="download" />
        </button>
        <button className="btn ghost icon-btn" title="Import backup" onClick={onImport}>
          <Icon name="upload" />
        </button>
        <button
          className="btn ghost icon-btn"
          title="Toggle theme"
          onClick={() => store.setTheme(state.ui.theme === 'dark' ? 'light' : 'dark')}
        >
          <Icon name={state.ui.theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        {!inDrawer ? (
          <button
            className="btn ghost icon-btn side-toggle"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => store.toggleSidebar()}
          >
            <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}

/**
 * Fixed bottom bar on phones — five real destinations.
 * No "More" tab: the topbar ☰ already opens the full drawer.
 */
export function MobileNav({
  items,
  view,
  onNavigate,
}: {
  items: NavItem[];
  view: ViewId;
  onNavigate: (v: ViewId) => void;
}) {
  const wanted: ViewId[] = ['dashboard', 'sprints', 'today', 'revision', 'calendar'];
  const primary = wanted
    .map((id) => items.find((i) => i.id === id && !i.sprintId))
    .filter((i): i is NavItem => Boolean(i));

  return (
    <nav className="mnav" aria-label="Primary">
      {primary.map((it) => (
        <button
          key={it.id}
          className="mnav-b"
          aria-current={view === it.id ? 'page' : undefined}
          onClick={() => onNavigate(it.id)}
        >
          <span className="mi" aria-hidden="true">{it.icon}</span>
          <span className="ml">{it.label}</span>
          {it.badge && it.badge !== '0' ? <span className={`mb ${it.hot ? 'hot' : ''}`} /> : null}
        </button>
      ))}
    </nav>
  );
}
