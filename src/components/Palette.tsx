import { useEffect, useMemo, useRef, useState } from 'react';
import type { CommandResult, Topic, ViewId } from '../types';
import { runCommand } from '../lib/commands';
import { store } from '../lib/store';
import { toast } from '../lib/toasts';
import { norm } from '../lib/utils';
import { xpFor } from '../lib/game';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Icon } from './Icons';
import { Badge, TypeTag } from './primitives';

/** verbs that mean "run this as a command" rather than "jump to a thing" */
const COMMAND_RE =
  /^(completed?|done|finish(ed)?|mark|start(ed|ing)?|begin|begun|doing|in\s*progress|revised?|needs?\s+revision|for\s+revision|move|reset|restart|clear|remove|delete|drop|today|focus|plan|note|notes|add|create|new|show|open|find|search|what|next|suggest|progress|status|stats|hld|lld|pattern|problem|overall|total)\b/i;

const VIEW_TARGETS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Base', icon: '◧' },
  { id: 'hld', label: 'HLD', icon: '🏗' },
  { id: 'lld', label: 'LLD', icon: '🔬' },
  { id: 'today', label: 'Quests', icon: '⚔' },
  { id: 'revision', label: 'Review', icon: '↻' },
  { id: 'awards', label: 'Awards', icon: '🏆' },
  { id: 'guide', label: 'Guide', icon: '?' },
];

interface Props {
  onClose: () => void;
  onOpenTopic: (id: string) => void;
}

export function Palette({ onClose, onOpenTopic }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useFocusTrap(ref, onClose);

  const [value, setValue] = useState('');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [sel, setSel] = useState(0);

  const isCommand = COMMAND_RE.test(value.trim());
  const q = norm(value);

  const topicHits = useMemo<Topic[]>(() => {
    if (!q || isCommand) return [];
    return store
      .getSnapshot()
      .topics.map((t) => {
        const n = norm(t.name);
        let sc = -1;
        if (n === q) sc = 100;
        else if (n.startsWith(q)) sc = 84;
        else if (n.includes(q)) sc = 70;
        else if (norm(t.category).includes(q)) sc = 46;
        else if (norm(t.notes).includes(q)) sc = 30;
        return { t, sc };
      })
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc || a.t.name.length - b.t.name.length)
      .slice(0, 7)
      .map((x) => x.t);
  }, [q, isCommand]);

  const viewHits = useMemo(() => {
    if (!q || isCommand) return [];
    return VIEW_TARGETS.filter((v) => norm(v.label).includes(q)).slice(0, 3);
  }, [q, isCommand]);

  const rows = [
    ...viewHits.map((v) => ({ kind: 'view' as const, v })),
    ...topicHits.map((t) => ({ kind: 'topic' as const, t })),
  ];

  useEffect(() => setSel(0), [value]);
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(id);
      document.body.style.overflow = '';
    };
  }, []);

  function activate(i: number) {
    const row = rows[i];
    if (!row) return;
    if (row.kind === 'view') {
      store.switchView(row.v.id);
      onClose();
    } else {
      onOpenTopic(row.t.id);
      onClose();
    }
  }

  function submit() {
    if (!isCommand && rows.length) {
      activate(sel);
      return;
    }
    const res = runCommand(value, (id) => {
      onOpenTopic(id);
      onClose();
    });
    setResult(res);
    if (res.ok) {
      toast(res.msg, 'ok');
      setValue('');
    }
  }

  return (
    <div className="ovl" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className="modal pal"
        role="dialog"
        aria-modal="true"
        aria-label="Command and search"
        tabIndex={-1}
      >
        <div className="pal-in">
          <Icon name="search" size={15} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Jump to a topic, or type a command…"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search or command"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, Math.max(0, rows.length - 1)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              }
            }}
          />
          <span className={`pal-mode ${isCommand ? 'cmd' : ''}`}>{isCommand ? 'command' : 'jump'}</span>
        </div>

        <div className="pal-body">
          {result ? (
            <div className={`pal-res ${result.ok ? 'ok' : 'warn'}`} role="status">
              {result.msg}
            </div>
          ) : null}

          {rows.length ? (
            <ul className="pal-list" role="listbox" aria-label="Results">
              {rows.map((row, i) => (
                <li key={row.kind === 'view' ? row.v.id : row.t.id}>
                  <button
                    className={`pal-row ${i === sel ? 'on' : ''}`}
                    role="option"
                    aria-selected={i === sel}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => activate(i)}
                  >
                    {row.kind === 'view' ? (
                      <>
                        <span className="pr-ico" aria-hidden="true">{row.v.icon}</span>
                        <span className="pr-n">{row.v.label}</span>
                        <span className="pr-m">view</span>
                      </>
                    ) : (
                      <>
                        <span className="pr-ico" aria-hidden="true">
                          {row.t.type === 'HLD' ? '🏗' : '🔬'}
                        </span>
                        <span className="pr-n">{row.t.name}</span>
                        <span className="pr-tags">
                          <TypeTag type={row.t.type} />
                          <Badge status={row.t.status} />
                          <span className="xp-tag">+{xpFor(row.t)}</span>
                        </span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!value ? (
            <div className="cmdgrid pal-help">
              <code>completed &lt;topic&gt;</code>
              <span className="muted">mark completed</span>
              <code>started &lt;topic&gt;</code>
              <span className="muted">mark in progress</span>
              <code>revised &lt;topic&gt;</code>
              <span className="muted">log a clean recall</span>
              <code>add &lt;name&gt; to &lt;track&gt;</code>
              <span className="muted">create a topic</span>
              <code>today &lt;topic&gt;</code>
              <span className="muted">accept as a quest</span>
              <code>hld progress</code>
              <span className="muted">quick numbers</span>
              <code>what should I study next</code>
              <span className="muted">suggestions</span>
            </div>
          ) : null}

          {value && !isCommand && !rows.length ? (
            <div className="pal-none">
              No topic matches “{value.trim()}”. Press <span className="kbd">Enter</span> to run it as a command.
            </div>
          ) : null}
        </div>

        <div className="pal-foot">
          <span>
            <span className="kbd">↑↓</span> navigate
          </span>
          <span>
            <span className="kbd">↵</span> {isCommand || !rows.length ? 'run' : 'open'}
          </span>
          <span>
            <span className="kbd">esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
