import type { CellRef, Coord, Range } from './types';

/** 0-indexed column → A1 label. 0 → "A", 25 → "Z", 26 → "AA", 701 → "ZZ", 702 → "AAA". */
export function columnLabel(col: number): string {
  if (col < 0 || !Number.isInteger(col)) {
    throw new RangeError(`columnLabel: expected a non-negative integer, got ${col}`);
  }
  let label = '';
  let n = col + 1;
  while (n > 0) {
    n -= 1;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}

/** A1 label → 0-indexed column. "A" → 0, "AA" → 26. Throws on invalid input. */
export function letterToColumnIndex(label: string): number {
  if (!/^[A-Z]+$/.test(label)) {
    throw new RangeError(`letterToColumnIndex: expected uppercase A-Z, got "${label}"`);
  }
  let n = 0;
  for (let i = 0; i < label.length; i += 1) {
    n = n * 26 + (label.charCodeAt(i) - 64);
  }
  return n - 1;
}

/** (0-indexed row, 0-indexed col) → A1 ref. */
export function cellAddress(row: number, col: number): CellRef {
  return `${columnLabel(col)}${row + 1}`;
}

const CELL_REF_RE = /^([A-Z]+)([1-9][0-9]*)$/;

/** A1 ref → coord. Returns `null` for invalid input (does not throw — refs come from user data). */
export function parseCellAddress(ref: CellRef): Coord | null {
  const match = ref.match(CELL_REF_RE);
  if (!match) return null;
  const [, label, rowStr] = match;
  // The regex captures guarantee these are non-empty, but TS strict undefined-index requires the guard.
  if (!label || !rowStr) return null;
  return {
    row: Number(rowStr) - 1,
    col: letterToColumnIndex(label),
  };
}

/** Swap `start`/`end` so `start.row <= end.row` and `start.col <= end.col`. */
export function normalizeRange(range: Range): Range {
  return {
    start: {
      row: Math.min(range.start.row, range.end.row),
      col: Math.min(range.start.col, range.end.col),
    },
    end: {
      row: Math.max(range.start.row, range.end.row),
      col: Math.max(range.start.col, range.end.col),
    },
  };
}

/** Inclusive containment check; `range` may be unnormalized. */
export function rangeContains(range: Range, row: number, col: number): boolean {
  const n = normalizeRange(range);
  return row >= n.start.row && row <= n.end.row && col >= n.start.col && col <= n.end.col;
}
