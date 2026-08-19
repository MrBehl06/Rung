import { useEffect, useRef, useState } from 'react';
import type { Status, Topic } from '../types';
import { STATUSES } from '../types';
import { store } from '../lib/store';
import { confirmDialog } from '../lib/dialog';
import { toast } from '../lib/toasts';
import { xpFor } from '../lib/game';
import { SR_STEPS, daysUntilDue, dueLabel, stepDays } from '../lib/srs';
import { fmtDate } from '../lib/utils';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Icon } from './Icons';
import { Badge, TypeTag } from './primitives';
import { Meter } from './hud';

interface Props {
  topic: Topic;
  onClose: () => void;
  onEdit: (id: string) => void;
}

export function TopicDrawer({ topic: t, onClose, onEdit }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);

  const [notes, setNotes] = useState(t.notes);
  const [dirty, setDirty] = useState(false);

  // reset the editor when a different topic is opened in the same drawer
  useEffect(() => {
    setNotes(t.notes);
    setDirty(false);
  }, [t.id, t.notes]);

  // autosave notes shortly after typing stops
  useEffect(() => {
    if (!dirty) return;
    const id = setTimeout(() => {
      store.updateTopic(t.id, { notes });
      setDirty(false);
    }, 700);
    return () => clearTimeout(id);
  }, [notes, dirty, t.id]);

  const due = daysUntilDue(t);
  const step = t.srStep ?? 0;

  const timeline: [string, string | null | undefined][] = [
    ['Created', t.createdAt],
    ['Started', t.dateStarted],
    ['Completed', t.dateCompleted],
    ['Last revised', t.lastRevisedAt],
    ['Next review', t.srDue],
  ];

  return (
    <div className="drawer-ovl" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${t.name}`}
        tabIndex={-1}
      >
        <header>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="dr-name">{t.name}</div>
            <div className="dr-meta">
              <TypeTag type={t.type} />
              <span>{t.category}</span>
              <span className={`d-${t.difficulty}`}>{t.difficulty}</span>
              <span className="xp-tag">+{xpFor(t)} XP</span>
            </div>
          </div>
          <button className="btn ghost icon-btn" aria-label="Close details" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div className="body">
          {/* status */}
          <div className="dr-block">
            <span className="fld-label">Status</span>
            <div className="dr-status">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={`dr-st ${t.status === s ? 'on' : ''}`}
                  aria-pressed={t.status === s}
                  onClick={() => store.setStatus(t.id, s as Status)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* review schedule */}
          <div className="dr-block">
            <span className="fld-label">Review schedule</span>
            <div className="dr-sr">
              <div className="dr-sr-top">
                <Badge status={t.status} />
                <span className="spacer" />
                <span className={`dr-due ${due !== null && due <= 0 ? 'now' : ''}`}>{dueLabel(due)}</span>
              </div>
              <div className="dr-ladder" role="img" aria-label={`Review step ${step + 1} of ${SR_STEPS.length}`}>
                {SR_STEPS.map((d, i) => (
                  <span key={d} className={`rung ${i <= step ? 'on' : ''}`} title={`${d}d`}>
                    {d}d
                  </span>
                ))}
              </div>
              <div className="row wrap" style={{ gap: 7, marginTop: 11 }}>
                <button
                  className="btn xs primary"
                  onClick={() => {
                    const r = store.review(t.id, 'good');
                    toast(`Recalled — next in ${stepDays(r?.srStep ?? 0)}d`, 'ok');
                  }}
                >
                  Recalled it
                </button>
                <button
                  className="btn xs"
                  onClick={() => {
                    store.review(t.id, 'hard');
                    toast('Back to the start of the ladder', 'warn');
                  }}
                >
                  Struggled
                </button>
                <button className="btn xs ghost" onClick={() => store.snooze(t.id, 3)}>
                  Snooze 3d
                </button>
              </div>
            </div>
          </div>

          {/* notes — the reason this drawer exists */}
          <div className="dr-block">
            <span className="fld-label">
              Notes {dirty ? <em className="dr-saving">saving…</em> : null}
            </span>
            <textarea
              className="dr-notes"
              value={notes}
              placeholder="Key ideas, trade-offs, diagrams to redraw, gotchas you keep forgetting…"
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
            />
            <p className="hint">Autosaves. Notes are searchable from the topic list and ⌘K.</p>
          </div>

          {/* stats */}
          <div className="dr-block">
            <span className="fld-label">History</span>
            <div className="dr-stats">
              <div className="dr-stat">
                <b>{t.revisionCount}</b>
                <span>revisions</span>
              </div>
              <div className="dr-stat">
                <b>{t.status === 'Completed' ? xpFor(t) : 0}</b>
                <span>XP earned</span>
              </div>
              <div className="dr-stat">
                <b>
                  {step + 1}/{SR_STEPS.length}
                </b>
                <span>review step</span>
              </div>
            </div>
            <Meter p={((step + 1) / SR_STEPS.length) * 100} cls="ok" seg />
            <dl className="dr-time">
              {timeline.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v ? fmtDate(v) : '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <footer>
          <button
            className="btn danger left"
            onClick={async () => {
              const ok = await confirmDialog({
                title: `Delete “${t.name}”?`,
                body: 'You can undo this from the toast straight after.',
                confirmLabel: 'Delete',
                danger: true,
              });
              if (ok) {
                store.deleteTopic(t.id);
                onClose();
              }
            }}
          >
            <Icon name="trash" size={12} />
            Delete
          </button>
          <button className="btn" onClick={() => onEdit(t.id)}>
            <Icon name="edit" size={12} />
            Edit fields
          </button>
          <button
            className="btn primary"
            onClick={() => {
              if (store.addToday(t.id)) toast('Added to today’s quests', 'ok');
            }}
          >
            <Icon name="plus" size={12} />
            Add quest
          </button>
        </footer>
      </div>
    </div>
  );
}
