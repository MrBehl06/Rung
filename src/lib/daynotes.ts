export interface NoteLine {
  /** index into the text's line array */
  index: number;
  /** the visible text, with any "- " marker stripped */
  text: string;
  /** a line starting with "- " is checkable */
  checkable: boolean;
  checked: boolean;
}

const MARKER = /^\s*-\s+/;

export function parseNote(text: string, checked: number[]): NoteLine[] {
  const on = new Set(checked);
  return text.split('\n').map((raw, index) => {
    const checkable = MARKER.test(raw);
    return {
      index,
      text: checkable ? raw.replace(MARKER, '') : raw,
      checkable,
      checked: checkable && on.has(index),
    };
  });
}

export function toggleLine(checked: number[], index: number): number[] {
  return checked.includes(index)
    ? checked.filter((i) => i !== index)
    : [...checked, index].sort((a, b) => a - b);
}

/**
 * Keep ticks attached to their lines when the text changes.
 *
 * Ticks are stored as line indices so the text stays exactly as typed, but
 * inserting a line above a ticked one shifts every index below it. This matches
 * ticked lines by content: a ticked line keeps its tick if the same content
 * still exists, and loses it otherwise. Duplicates are consumed in order, so
 * two identical ticked lines both stay ticked while an untouched identical line
 * does not steal a tick.
 */
export function remapChecked(prevText: string, nextText: string, checked: number[]): number[] {
  if (prevText === nextText) return checked;

  const prevLines = prevText.split('\n');
  const nextLines = nextText.split('\n');
  const taken = new Set<number>();
  const out: number[] = [];

  for (const i of [...checked].sort((a, b) => a - b)) {
    const content = prevLines[i];
    if (content == null) continue;
    const found = nextLines.findIndex((l, j) => l === content && !taken.has(j));
    if (found >= 0) {
      taken.add(found);
      out.push(found);
    }
  }
  return out.sort((a, b) => a - b);
}
