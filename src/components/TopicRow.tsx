import type { Topic } from '../types';
import { store } from '../lib/store';
import { confirmDialog } from '../lib/dialog';
import { toast } from '../lib/toasts';
import { fmtDate } from '../lib/utils';
import { xpFor } from '../lib/game';
import { daysUntilDue, dueLabel } from '../lib/srs';
import { Icon } from './Icons';
import { Badge, TypeTag } from './primitives';

interface Props {
  topic: Topic;
  onEdit: (id: string) => void;
  /** open the detail drawer */
  onOpen?: (id: string) => void;
  noToday?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  /** j/k cursor is on this row */
  active?: boolean;
}

export function TopicRow({ topic: t, onEdit, onOpen, noToday, selected, onSelect, active }: Props) {
  const done = t.status === 'Completed';
  const due = daysUntilDue(t);
  const overdue = due !== null && due <= 0 && done;

  return (
    <div
      className={`titem ${selected ? 'is-picked' : ''} ${active ? 'is-active' : ''}`}
      data-status={t.status}
      data-tid={t.id}
    >
      {onSelect ? (
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
        title={done ? 'Un-complete' : `Complete for +${xpFor(t)} XP`}
        aria-label={`toggle complete for ${t.name}`}
        onClick={() => store.toggleComplete(t.id)}
      >
        <Icon name="check" />
      </button>

      <div className="main">
        <div className="nm">
          {onOpen ? (
            <button className="txt as-link" onClick={() => onOpen(t.id)} title="Open details">
              {t.name}
            </button>
          ) : (
            <span className="txt">{t.name}</span>
          )}
          <Badge status={t.status} />
          {overdue ? <span className="due-pill">review due</span> : null}
        </div>
        <div className="sub">
          <TypeTag type={t.type} />
          <span>{t.category}</span>
          <span className={`d-${t.difficulty}`}>{t.difficulty}</span>
          <span className="xp-tag">+{xpFor(t)} XP</span>
          {t.revisionCount ? <span title="reviews logged">↻ {t.revisionCount}</span> : null}
          {done && due !== null ? <span title="next review">🗓 {dueLabel(due)}</span> : null}
          {!done && t.dateStarted ? <span title="started">▶ {fmtDate(t.dateStarted)}</span> : null}
          {t.notes ? (
            <span title="has notes">
              <Icon name="note" size={11} style={{ verticalAlign: '-1px' }} />
            </span>
          ) : null}
        </div>
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
        {!noToday ? (
          <button
            className="btn xs ghost"
            title="Add to today's quests"
            onClick={() => {
              if (store.addToday(t.id)) toast(`“${t.name}” added to today’s quests`, 'ok');
            }}
          >
            +Quest
          </button>
        ) : null}
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
