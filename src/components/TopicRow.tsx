import type { Topic } from '../types';
import { store } from '../lib/store';
import { confirmDialog } from '../lib/dialog';
import { xpFor } from '../lib/game';
import { daysUntilDue, dueLabel } from '../lib/srs';
import { Icon } from './Icons';
import { Badge } from './primitives';

interface Props {
  topic: Topic;
  onEdit: (id: string) => void;
  /** open the detail drawer */
  onOpen?: (id: string) => void;
  selected?: boolean;
  onSelect?: () => void;
  /** something is selected, so show the select affordance on every row */
  selecting?: boolean;
  /** j/k cursor is on this row */
  active?: boolean;
}

export function TopicRow({ topic: t, onEdit, onOpen, selected, onSelect, selecting, active }: Props) {
  const done = t.status === 'Completed';
  const due = daysUntilDue(t);
  const overdue = due !== null && due <= 0 && done;
  // "Not Started" is the default for most rows — showing it on every one is noise
  const showBadge = t.status !== 'Not Started';

  return (
    <div
      className={`titem ${selected ? 'is-picked' : ''} ${active ? 'is-active' : ''}`}
      data-status={t.status}
      data-tid={t.id}
    >
      {onSelect && (selecting || selected) ? (
        <button
          className={`pick ${selected ? 'on' : ''}`}
          aria-label={selected ? `Deselect ${t.name}` : `Select ${t.name}`}
          aria-pressed={!!selected}
          onClick={onSelect}
        >
          <Icon name="check" size={10} />
        </button>
      ) : null}

      <button
        className="chk"
        data-on={done ? 1 : 0}
        title={done ? 'Un-complete' : `Complete for +${xpFor(t)} XP · shift-click to select`}
        aria-label={`toggle complete for ${t.name}`}
        onClick={(e) => {
          // shift-click selects instead of completing, so the row needs no second circle
          if (e.shiftKey && onSelect) onSelect();
          else store.toggleComplete(t.id);
        }}
      >
        <Icon name="check" />
      </button>

      <div className="main">
        {onOpen ? (
          <button className="txt as-link" onClick={() => onOpen(t.id)} title="Open details">
            {t.name}
          </button>
        ) : (
          <span className="txt">{t.name}</span>
        )}
        {showBadge ? <Badge status={t.status} /> : null}
        {overdue ? <span className="due-pill">due</span> : null}
      </div>

      <div className="meta">
        {t.notes ? <Icon name="note" size={11} /> : null}
        {t.revisionCount ? <span title="reviews logged">↻{t.revisionCount}</span> : null}
        {done && due !== null ? <span title="next review">{dueLabel(due)}</span> : null}
        <span className={`d-${t.difficulty}`}>{t.difficulty}</span>
        <span className="xp-tag">+{xpFor(t)}</span>
      </div>

      <div className="acts">
        {t.status !== 'In Progress' && !done ? (
          <button className="btn xs ghost" title="Mark in progress" onClick={() => store.start(t.id)}>
            Start
          </button>
        ) : null}
        {t.status === 'Needs Revision' ? (
          <button className="btn xs ghost" title="Log a clean recall" onClick={() => store.review(t.id, 'good')}>
            Recalled
          </button>
        ) : null}
        <button className="btn xs ghost" title="Edit fields" onClick={() => onEdit(t.id)}>
          <Icon name="edit" size={12} />
        </button>
        {t.status !== 'Not Started' ? (
          <button className="btn xs ghost" title="Reset to Not Started" onClick={() => store.reset(t.id)}>
            <Icon name="reset" size={12} />
          </button>
        ) : null}
        <button
          className="btn xs danger"
          title="Delete"
          onClick={async () => {
            const ok = await confirmDialog({
              title: `Delete “${t.name}”?`,
              body: 'You can undo this from the toast straight after.',
              confirmLabel: 'Delete',
              danger: true,
            });
            if (ok) store.deleteTopic(t.id);
          }}
        >
          <Icon name="trash" size={12} />
        </button>
      </div>
    </div>
  );
}
