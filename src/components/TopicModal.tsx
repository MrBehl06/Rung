import { useEffect, useRef, useState } from 'react';
import type { Difficulty, Status, Topic, TopicType, TrackerState } from '../types';
import { DIFFS, STATUSES, TYPES } from '../types';
import { CATS } from '../data/seed';
import { store } from '../lib/store';
import { toast } from '../lib/toasts';
import { Icon } from './Icons';

interface Props {
  /** null = creating a new topic */
  editing: Topic | null;
  state: TrackerState;
  onClose: () => void;
}

export function TopicModal({ editing, state, onClose }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<TopicType>(editing?.type ?? 'HLD');
  const [category, setCategory] = useState(editing?.category ?? CATS.HLD[0]);
  const [status, setStatus] = useState<Status>(editing?.status ?? 'Not Started');
  const [difficulty, setDifficulty] = useState<Difficulty>(editing?.difficulty ?? 'Medium');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [dateStarted, setDateStarted] = useState((editing?.dateStarted ?? '').slice(0, 10));
  const [dateCompleted, setDateCompleted] = useState((editing?.dateCompleted ?? '').slice(0, 10));
  const [revisionCount, setRevisionCount] = useState(String(editing?.revisionCount ?? 0));

  useEffect(() => {
    const id = setTimeout(() => nameRef.current?.focus(), 30);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(id);
      document.body.style.overflow = '';
    };
  }, []);

  // categories for the chosen type, plus any custom ones the user already uses
  const cats = [
    ...CATS[type],
    ...state.topics.filter((x) => x.type === type && !CATS[type].includes(x.category)).map((x) => x.category),
  ].filter((v, i, a) => a.indexOf(v) === i);

  function pickType(next: TopicType) {
    setType(next);
    if (!CATS[next].includes(category)) setCategory(CATS[next][0]);
  }

  function save() {
    const clean = name.trim();
    if (!clean) {
      toast('Name is required', 'err');
      nameRef.current?.focus();
      return;
    }
    const patch = {
      name: clean,
      type,
      category,
      status,
      difficulty,
      notes,
      dateStarted: dateStarted || null,
      dateCompleted: dateCompleted || null,
      revisionCount: Math.max(0, parseInt(revisionCount, 10) || 0),
    };
    if (editing) {
      store.updateTopic(editing.id, patch);
      toast('Saved', 'ok');
    } else {
      store.addTopic(patch);
      toast(`Added “${clean}”`, 'ok');
    }
    onClose();
  }

  return (
    <div
      className="ovl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit topic' : 'Add topic'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
      >
        <header>
          <h3>{editing ? 'Edit topic' : 'Add topic'}</h3>
          <button className="btn ghost icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div className="body">
          <label className="fld">
            <span>Name</span>
            <input
              ref={nameRef}
              type="text"
              value={name}
              placeholder="e.g. Design Reddit"
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
              }}
            />
          </label>

          <div className="fld">
            <span
              style={{
                display: 'block',
                fontSize: 'var(--fs-xs)',
                textTransform: 'uppercase',
                letterSpacing: '.6px',
                color: 'var(--tx-3)',
                marginBottom: 5,
                fontWeight: 600,
              }}
            >
              Type
            </span>
            <div className="seg">
              {TYPES.map((x) => (
                <button key={x} type="button" aria-pressed={x === type} onClick={() => pickType(x)}>
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div className="grid g-2">
            <label className="fld">
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span>Difficulty</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                {DIFFS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid g-2">
            <label className="fld">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {STATUSES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span>Revision count</span>
              <input
                type="number"
                min="0"
                step="1"
                value={revisionCount}
                onChange={(e) => setRevisionCount(e.target.value)}
              />
            </label>
          </div>

          <div className="grid g-2">
            <label className="fld">
              <span>Date started</span>
              <input type="date" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} />
            </label>
            <label className="fld">
              <span>Date completed</span>
              <input type="date" value={dateCompleted} onChange={(e) => setDateCompleted(e.target.value)} />
            </label>
          </div>

          <label className="fld" style={{ marginBottom: 0 }}>
            <span>Notes</span>
            <textarea
              value={notes}
              placeholder="Key ideas, trade-offs, links, gotchas…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <footer>
          {editing ? (
            <button
              className="btn danger left"
              onClick={() => {
                if (confirm(`Delete “${editing.name}”? This cannot be undone.`)) {
                  store.deleteTopic(editing.id);
                  onClose();
                  toast('Topic deleted', 'warn');
                }
              }}
            >
              <Icon name="trash" size={12} />
              Delete
            </button>
          ) : (
            <span className="left" />
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            {editing ? 'Save changes' : 'Add topic'}
          </button>
        </footer>
      </div>
    </div>
  );
}
