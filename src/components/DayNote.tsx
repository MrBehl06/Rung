import { useEffect, useRef, useState } from 'react';
import type { DayNote as DayNoteData } from '../types';
import { parseNote } from '../lib/daynotes';
import { store } from '../lib/store';

const HINT = 'What are you doing this day?';
const PLACEHOLDER = `${HINT}\nStart a line with "- " to make it tickable.`;

export function DayNote({ date, note }: { date: string; note: DayNoteData | undefined }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.text ?? '');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // a different day was selected — drop any in-flight draft
  useEffect(() => {
    setEditing(false);
    setDraft(note?.text ?? '');
  }, [date, note?.text]);

  // debounce writes so typing does not thrash storage
  useEffect(() => {
    if (!editing) return;
    const id = setTimeout(() => store.setDayNote(date, draft), 400);
    return () => clearTimeout(id);
  }, [draft, editing, date]);

  useEffect(() => {
    if (editing) areaRef.current?.focus();
  }, [editing]);

  function stopEditing() {
    store.setDayNote(date, draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        ref={areaRef}
        className="dn-edit"
        value={draft}
        placeholder={PLACEHOLDER}
        aria-label={`Note for ${date}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={stopEditing}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            stopEditing();
          }
        }}
      />
    );
  }

  const lines = parseNote(note?.text ?? '', note?.checked ?? []);
  const empty = !note?.text.trim();

  return (
    <div className="dn-read">
      {empty ? (
        <button className="dn-empty" onClick={() => setEditing(true)}>
          {HINT}
        </button>
      ) : (
        <>
          {lines.map((ln) =>
            ln.checkable ? (
              <label key={ln.index} className={`dn-line dn-check ${ln.checked ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={ln.checked}
                  onChange={() => store.toggleDayLine(date, ln.index)}
                />
                <span>{ln.text}</span>
              </label>
            ) : (
              <p key={ln.index} className="dn-line" onClick={() => setEditing(true)}>
                {ln.text || ' '}
              </p>
            ),
          )}
          <button className="dn-edit-btn" onClick={() => setEditing(true)}>
            edit
          </button>
        </>
      )}
    </div>
  );
}
