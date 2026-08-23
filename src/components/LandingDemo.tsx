/**
 * Small live demonstrations for the home page.
 *
 * Each one is plain markup driven by CSS keyframes that only start once the
 * band is revealed (the `.in` class the reveal hook adds). They are cheaper
 * than a screenshot, never go stale, theme correctly, and — unlike a still —
 * they actually show the idea moving: a week filling, a ladder climbing,
 * links landing on a topic.
 */
import { Icon } from './Icons';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/** which days are active — five of seven, matching the default target */
const HIT = [true, true, false, true, true, true, false];

export function SprintsDemo() {
  const rows = [
    { n: 'High Level Design', c: 54, pct: 62, k: 'HLD' },
    { n: 'Low Level Design', c: 60, pct: 31, k: 'LLD' },
    { n: 'Blind 75', c: 75, pct: 12, k: 'DSA' },
  ];
  return (
    <div className="demo demo-sprints">
      {rows.map((r, i) => (
        <div className="dm-card" key={r.k} style={{ ['--i' as string]: i }}>
          <div className="dm-card-h">
            <b>{r.n}</b>
            <em>{r.c}</em>
          </div>
          <span className="dm-pct">{r.pct}%</span>
          <span className="dm-bar">
            <i style={{ ['--to' as string]: `${r.pct}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function CalendarDemo() {
  // 35 cells; the numbers are the ones that carry activity
  const active: Record<number, number> = {
    3: 2, 4: 1, 6: 3, 8: 1, 10: 2, 11: 3, 13: 1, 15: 2, 17: 3, 18: 1, 20: 2, 22: 3, 24: 1, 25: 2,
  };
  return (
    <div className="demo demo-cal">
      <div className="dm-cal-head">
        {WEEK.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="dm-grid">
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className={`dm-cell ${active[i] ? 'on' : ''} ${i === 22 ? 'today' : ''}`}
            data-l={active[i] ?? 0}
            style={{ ['--i' as string]: i }}
          />
        ))}
      </div>
      <div className="dm-note">
        <span className="dm-note-t">Wed 22</span>
        <label className="dm-todo done">
          <i />finish sharding notes
        </label>
        <label className="dm-todo">
          <i />redo rate limiter
        </label>
      </div>
    </div>
  );
}

export function TopicsDemo() {
  const links = [
    ['CAP FAQ', 'martinfowler.com'],
    ['CAP in 10 minutes', 'youtube.com'],
    ['DDIA chapter 9', 'dataintensive.net'],
  ];
  return (
    <div className="demo demo-topic">
      <div className="dm-topic-h">
        <b>CAP Theorem</b>
        <em>HLD · Fundamentals</em>
      </div>
      <p className="dm-notes">PACELC is the follow-up — latency versus consistency even when nothing is partitioned.</p>
      <span className="dm-lbl">Resources</span>
      {links.map(([t, host], i) => (
        <span className="dm-link" key={t} style={{ ['--i' as string]: i }}>
          <Icon name="link" size={11} />
          <b>{t}</b>
          <em>{host}</em>
        </span>
      ))}
    </div>
  );
}

export function StreaksDemo() {
  return (
    <div className="demo demo-streak">
      <div className="dm-streak-top">
        <span className="dm-streak-n">5</span>
        <span className="dm-streak-l">
          of 7 days
          <em>this week</em>
        </span>
      </div>
      <div className="dm-week">
        {WEEK.map((d, i) => (
          <span key={i} className={`dm-day ${HIT[i] ? 'on' : ''}`} style={{ ['--i' as string]: i }}>
            <i />
            <em>{d}</em>
          </span>
        ))}
      </div>
      <span className="dm-streak-note">Miss one and the week still lands.</span>
    </div>
  );
}
