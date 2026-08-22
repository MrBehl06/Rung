import type { Stats, TrackerState, ViewId } from '../types';
import type { LevelInfo } from '../lib/game';
import { completionStreak, weekProgress } from '../lib/streak';
import { joinedSprintDefs } from '../lib/scope';
import { NavGroup } from './NavGroup';
import { store } from '../lib/store';
import { Icon } from './Icons';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  badge?: string;
  hot?: boolean;
}

export function navItems(dueCount: number): NavItem[] {
  return [
    { id: 'dashboard', label: 'Base', icon: '◧' },
    { id: 'calendar', label: 'Calendar', icon: '▦' },
    { id: 'sprints', label: 'Sprints', icon: '◈' },
    { id: 'revision', label: 'Review', icon: '↻', badge: String(dueCount), hot: dueCount > 0 },
    { id: 'rewards', label: 'Rewards', icon: '☘' },
  ];
}

interface Props {
  state: TrackerState;
  stats: Stats;
  lv: LevelInfo;
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
  stats,
  lv,
  items,
  collapsed,
  inDrawer,
  onNavigate,
  onExport,
  onImport,
}: Props) {
  const view = state.ui.view;
  const week = weekProgress(state);
  const streak = completionStreak(state);

  return (
    <aside className={`side ${collapsed && !inDrawer ? 'is-collapsed' : ''} ${inDrawer ? 'in-drawer' : ''}`}>
      <div className="side-brand">
        <span className="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="19" height="19">
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
              {/* rails, slightly splayed so it reads as a ladder rather than an H */}
              <path d="M6.5 3.5L5 20.5M17.5 3.5L19 20.5" />
              <path d="M6.9 8.5h10.2M6.5 13.5h11M6.1 18.5h11.8" />
            </g>
          </svg>
        </span>
        <span className="side-brand-txt">
          <b>RUNG</b>
          <small>interview prep</small>
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

        <div className="side-week">
          <span className="side-week-top">
            <span>this week</span>
            <b className={week.done ? 'done' : ''}>
              {week.hit}/{week.target}
            </b>
          </span>
          <span className="side-dots" aria-label={`${week.hit} of ${week.target} days this week`}>
            {week.days.map((on, i) => (
              <i key={i} className={on ? 'on' : ''} />
            ))}
          </span>
          {streak > 1 ? <span className="side-streak">{streak} day streak</span> : null}
        </div>
      </div>

      <nav className="side-nav" aria-label="Main">
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
          // auto-expand while a sprint page is open, so the current sprint is
          // never hidden behind a collapsed parent
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
                  aria-current={
                    view === 'sprint' && state.ui.activeSprint === sp.id ? 'page' : undefined
                  }
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
  const wanted: ViewId[] = ['dashboard', 'calendar', 'sprints', 'revision', 'rewards'];
  const primary = wanted
    .map((id) => items.find((i) => i.id === id))
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
