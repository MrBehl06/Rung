import type { Topic } from '../types';
import { store } from '../lib/store';
import { confirmDialog } from '../lib/dialog';
import { xpFor } from '../lib/game';
import { daysUntilDue } from '../lib/srs';
import { Icon } from './Icons';

interface Props {
  topic: Topic;
  onEdit: (id: string) => void;
  /** open the detail drawer, where notes and resources live */
  onOpen?: (id: string) => void;
  selected?: boolean;
  onSelect?: () => void;
  /** something is selected, so show the select affordance on every card */
  selecting?: boolean;
  /** j/k cursor is on this card */
  active?: boolean;
  /** show the category line — only useful when the list is not grouped by it */
  showCategory?: boolean;
}

export function TopicCard({
  topic: t,
  onEdit,
  onOpen,
  selected,
  onSelect,
  selecting,
  active,
  showCategory,
}: Props) {
  const done = t.status === 'Completed';
  const due = daysUntilDue(t);
  const overdue = due !== null && due <= 0 && done;
  // a topic you have reviewed but that sits back at rung 0 is one you fumbled —
  // that predicts what to redo far better than its nominal difficulty does
  const struggled = t.status === 'Needs Revision' || (t.revisionCount > 0 && (t.srStep ?? 0) === 0);

  return (
    <article
      className={`tcard ${selected ? 'is-picked' : ''} ${active ? 'is-active' : ''}`}
      data-status={t.status}
      data-tid={t.id}
    >
      <div className="tcard-top">
        <button
          className="chk"
          data-on={done ? 1 : 0}
          title={done ? 'Un-complete' : `Complete for +${xpFor(t)} XP · shift-click to select`}
          aria-label={`toggle complete for ${t.name}`}
          onClick={(e) => {
            // shift-click selects, so the card needs no second control
            if (e.shiftKey && onSelect) onSelect();
            else store.toggleComplete(t.id);
          }}
        >
          <Icon name="check" />
        </button>

        <span className="spacer" />

        <button
          className={`tcard-star ${t.bookmarked ? 'on' : ''}`}
          aria-label={t.bookmarked ? `Unstar ${t.name}` : `Star ${t.name}`}
          aria-pressed={t.bookmarked}
          title={t.bookmarked ? 'Remove from Saved' : 'Save for later'}
          onClick={() => store.toggleBookmark(t.id)}
        >
          <Icon name={t.bookmarked ? 'star' : 'star-o'} size={13} />
        </button>

        {t.links.length ? (
          <span className="tcard-links" title={`${t.links.length} saved resource${t.links.length > 1 ? 's' : ''}`}>
            <Icon name="link" size={11} />
            {t.links.length}
          </span>
        ) : null}
        {t.notes ? <Icon name="note" size={11} /> : null}
        {overdue ? <span className="due-pill">due</span> : null}
      </div>

      <button className="tcard-name" onClick={() => onOpen?.(t.id)} title="Open details">
        {t.name}
      </button>

      {showCategory ? <span className="tcard-cat">{t.category}</span> : null}

      <div className="tcard-foot">
        {struggled ? (
          <span className="d-struggled" title="Dropped back to the start of the review ladder">
            struggled
          </span>
        ) : (
          <span className={`d-${t.difficulty}`}>{t.difficulty}</span>
        )}
        <span className="xp-tag">+{xpFor(t)}</span>
        <span className="spacer" />
        <span className="tcard-acts">
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
          {!done && t.status !== 'In Progress' ? (
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
        </span>
      </div>
    </article>
  );
}
