import type { CommandResult, Topic, TopicType } from '../types';
import { TYPES } from '../types';
import { CATS } from '../data/seed';
import { store } from './store';
import { computeStats, suggestNext } from './stats';
import { norm } from './utils';

interface MatchResult {
  hit: Topic | null;
  options: Topic[];
  ambiguous?: boolean;
}

/** Fuzzy topic lookup: exact > prefix > substring > token overlap. */
export function matchTopic(query: string, pool?: Topic[]): MatchResult {
  const q = norm(query);
  if (!q) return { hit: null, options: [] };
  const list = pool ?? store.getSnapshot().topics;

  const scored = list
    .map((t) => {
      const n = norm(t.name);
      let sc = -1;
      if (n === q) sc = 100;
      else if (n.startsWith(q)) sc = 84;
      else if (n.includes(q)) sc = 72;
      else if (q.includes(n) && n.length > 2) sc = 66;
      else {
        const qt = q.split(' ').filter(Boolean);
        const nt = n.split(' ').filter(Boolean);
        const hits = qt.filter((w) => nt.some((x) => x.startsWith(w) || w.startsWith(x)));
        if (hits.length) sc = 30 + (hits.length / qt.length) * 30 - Math.abs(nt.length - qt.length);
      }
      if (sc > 0 && norm(t.category).includes(q)) sc += 2;
      return { t, sc };
    })
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc || a.t.name.length - b.t.name.length);

  if (!scored.length) return { hit: null, options: [] };
  const top = scored[0];
  const tie = scored.filter((x) => x.sc === top.sc);
  if (tie.length > 1 && top.sc < 100) {
    return { hit: null, options: tie.slice(0, 6).map((x) => x.t), ambiguous: true };
  }
  return { hit: top.t, options: scored.slice(0, 6).map((x) => x.t) };
}

export function findCategory(text: string): { type: TopicType; cat: string } | null {
  const q = norm(text);
  for (const type of TYPES) for (const c of CATS[type]) if (norm(c) === q) return { type, cat: c };
  for (const type of TYPES) {
    for (const c of CATS[type]) {
      if (norm(c).includes(q) || q.includes(norm(c))) return { type, cat: c };
    }
  }
  return null;
}

function progressReply(scope: string): string {
  const s = computeStats(store.getSnapshot());
  if (scope === 'hld')
    return `HLD: ${s.hld.done}/${s.hld.total} done (${s.hld.pct}%) · ${s.hld.prog} in progress · ${s.hld.rev} to revise`;
  if (scope === 'lld')
    return `LLD: ${s.lld.done}/${s.lld.total} done (${s.lld.pct}%) · patterns ${s.patterns.done}/${s.patterns.total}`;
  if (scope === 'patterns')
    return `Design patterns: ${s.patterns.done}/${s.patterns.total} (${s.patterns.pct}%)`;
  if (scope === 'problems')
    return `Problems: ${s.problems.done}/${s.problems.total} (${s.problems.pct}%) — HLD ${s.hldProblems.done}/${s.hldProblems.total}, LLD ${s.lldProblems.done}/${s.lldProblems.total}`;
  return `Overall: ${s.all.done}/${s.all.total} (${s.all.pct}%) · HLD ${s.hld.pct}% · LLD ${s.lld.pct}% · ${s.needsRevision.length} need revision`;
}

function miss(q: string, r?: MatchResult): CommandResult {
  if (r?.options?.length) {
    return {
      ok: false,
      msg: `Which one? ${r.options.map((t) => t.name).join(' · ')}`,
      options: r.options,
    };
  }
  return { ok: false, msg: `No topic matching “${q}”. Try “add ${q}”.` };
}

interface Cmd {
  re: RegExp;
  run?: (m: RegExpMatchArray) => CommandResult;
  /** shorthand: resolve m[1] to a topic, then act on it */
  act?: (t: Topic) => string;
}

const CMDS: Cmd[] = [
  // --- queries first ---
  {
    re: /^(?:what\s+should\s+i\s+(?:study|do)\s*(?:next)?|next|suggest)\b/i,
    run: () => {
      const n = suggestNext(store.getSnapshot(), 5);
      return {
        ok: true,
        msg: n.length
          ? 'Study next: ' + n.map((t) => `${t.name} (${t.type}·${t.difficulty})`).join(' · ')
          : 'Everything is completed.',
      };
    },
  },
  {
    re: /\b(?:show\s+(?:me\s+)?(?:my\s+)?)?(hld|lld|pattern|problem|overall|total)\w*\s+progress\b/i,
    run: (m) => ({
      ok: true,
      msg: progressReply(m[1].toLowerCase().replace(/^(pattern|problem)$/, '$1s')),
    }),
  },
  { re: /^(?:progress|status|stats)\b/i, run: () => ({ ok: true, msg: progressReply('all') }) },

  // --- mutations ---
  {
    re: /^(?:add|create|new)\s+(.+)$/i,
    run: (m) => {
      let rest = m[1].trim();
      let type: TopicType | null = null;
      let cat: string | null = null;

      const asType = rest.match(/\b(?:as|in|under|to)\s+(hld|lld)\b/i);
      if (asType) {
        type = asType[1].toUpperCase() as TopicType;
        rest = rest.replace(asType[0], '').trim();
      }
      const toCat = rest.match(/\s+(?:to|in|under)\s+(.+)$/i);
      if (toCat && toCat.index != null) {
        const f = findCategory(toCat[1]);
        if (f) {
          cat = f.cat;
          type = type ?? f.type;
          rest = rest.slice(0, toCat.index).trim();
        }
      }
      rest = rest.replace(/^(?:topic|problem|pattern)\s+/i, '').replace(/["'`]/g, '').trim();
      if (!rest) return { ok: false, msg: 'What should I add?' };
      if (!type) type = 'HLD';
      if (!cat) cat = type === 'HLD' ? 'HLD Problems' : 'LLD Problems';

      const t = store.addTopic({ name: rest, type, category: cat });
      return t
        ? { ok: true, msg: `Added “${t.name}” to ${t.type} · ${t.category}`, topic: t }
        : { ok: false, msg: 'Could not add that.' };
    },
  },
  {
    re: /^(?:completed?|done|finish(?:ed)?|mark\s+done)\s+(.+)$/i,
    act: (t) => {
      store.complete(t.id);
      return `Completed “${t.name}”`;
    },
  },
  {
    re: /^(?:start(?:ed|ing)?|begin|begun|doing|in\s*progress)\s+(.+)$/i,
    act: (t) => {
      store.start(t.id);
      return `Started “${t.name}”`;
    },
  },
  {
    re: /^(?:revised|mark\s+revised)\s+(.+)$/i,
    act: (t) => {
      const r = store.markRevised(t.id);
      return `Revised “${t.name}” (count: ${r?.revisionCount ?? t.revisionCount})`;
    },
  },
  {
    re: /^(?:revise|needs?\s+revision|for\s+revision)\s+(.+)$/i,
    act: (t) => {
      store.needsRevision(t.id);
      return `“${t.name}” moved to Needs Revision`;
    },
  },
  {
    re: /^move\s+(.+?)\s+to\s+(?:revision|needs\s+revision)$/i,
    act: (t) => {
      store.needsRevision(t.id);
      return `“${t.name}” moved to Needs Revision`;
    },
  },
  {
    re: /^move\s+(.+?)\s+to\s+(?:done|completed)$/i,
    act: (t) => {
      store.complete(t.id);
      return `Completed “${t.name}”`;
    },
  },
  {
    re: /^move\s+(.+?)\s+to\s+(.+)$/i,
    run: (m) => {
      const r = matchTopic(m[1]);
      if (!r.hit) return miss(m[1], r);
      const f = findCategory(m[2]);
      if (!f) return { ok: false, msg: `No category matching “${m[2]}”.` };
      store.moveTopic(r.hit.id, f.type, f.cat);
      return { ok: true, msg: `Moved “${r.hit.name}” → ${f.type} · ${f.cat}`, topic: r.hit };
    },
  },
  {
    re: /^(?:reset|restart|clear)\s+(.+)$/i,
    act: (t) => {
      store.reset(t.id);
      return `Reset “${t.name}” to Not Started`;
    },
  },
  {
    re: /^(?:remove|delete|drop)\s+(.+)$/i,
    act: (t) => {
      store.deleteTopic(t.id);
      return `Deleted “${t.name}”`;
    },
  },
  {
    re: /^(?:today|focus(?:\s+on)?|plan)\s+(.+)$/i,
    act: (t) => {
      store.addToday(t.id);
      return `Added “${t.name}” to Today’s Focus`;
    },
  },
  {
    re: /^(?:note|notes)\s+(?:on\s+|for\s+)?(.+?)\s*[:—-]\s*(.+)$/i,
    run: (m) => {
      const r = matchTopic(m[1]);
      if (!r.hit) return miss(m[1], r);
      store.updateTopic(r.hit.id, {
        notes: (r.hit.notes ? r.hit.notes + '\n' : '') + m[2].trim(),
      });
      return { ok: true, msg: `Note added to “${r.hit.name}”`, topic: r.hit };
    },
  },
  {
    re: /^(?:show|open|find|search)\s+(.+)$/i,
    run: (m) => {
      const q = m[1].trim();
      store.switchView('hld');
      store.setFilters({ q, type: 'all' });
      return { ok: true, msg: `Filtered by “${q}”` };
    },
  },
];

/**
 * Plain-English command entry point. Used by the ⌘K palette and exposed as
 * `window.tracker.run(...)` so the console (or an agent) drives the same paths.
 */
export function runCommand(input: string, onOpenTopic?: (id: string) => void): CommandResult {
  const text = String(input ?? '').trim().replace(/[.!]+$/, '');
  if (!text) return { ok: false, msg: 'Type a command.' };

  for (const c of CMDS) {
    const m = text.match(c.re);
    if (!m) continue;
    if (c.run) return c.run(m);
    const r = matchTopic(m[1]);
    if (!r.hit) return miss(m[1], r);
    const msg = c.act!(r.hit);
    return { ok: true, msg, topic: r.hit };
  }

  // bare topic name → open it
  const r = matchTopic(text);
  if (r.hit) {
    onOpenTopic?.(r.hit.id);
    return { ok: true, msg: `Opened “${r.hit.name}”`, topic: r.hit };
  }
  return {
    ok: false,
    msg: 'Not understood. Try: completed Parking Lot · started Kafka · add Design Reddit · move Singleton to revision · remove Pastebin',
  };
}
