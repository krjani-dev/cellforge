import type { Coord, Range, SelectionMode, Selection, EditingState, CellRef, Cell } from './types';
import { normalizeRange, parseCellAddress, cellAddress } from './addressing';

export function cellRange(start: Coord, end: Coord): Range {
  return normalizeRange({ start, end });
}

export function singleCellRange(row: number, col: number): Range {
  return { start: { row, col }, end: { row, col } };
}

export function deriveSelectionMode(
  range: Range,
  rowCount: number,
  columnCount: number,
): SelectionMode {
  const n = normalizeRange(range);
  const fullRows = n.start.col === 0 && n.end.col === columnCount - 1;
  const fullCols = n.start.row === 0 && n.end.row === rowCount - 1;
  if (fullRows && fullCols) return 'all';
  if (fullRows) return 'row';
  if (fullCols) return 'column';
  if (n.start.row === n.end.row && n.start.col === n.end.col) return 'cell';
  return 'range';
}

export function shiftIndexMap<T>(
  map: Record<number, T>,
  at: number,
  delta: number,
): Record<number, T> {
  const next: Record<number, T> = {};
  for (const [key, value] of Object.entries(map)) {
    const i = Number(key);
    if (delta < 0 && i === at) continue; // deleted slot
    next[i >= at ? i + delta : i] = value;
  }
  return next;
}

export function rekeyCells(
  cells: Record<CellRef, Cell>,
  shift: (coord: Coord) => Coord | null,
): Record<CellRef, Cell> {
  const next: Record<CellRef, Cell> = {};
  for (const [ref, cell] of Object.entries(cells)) {
    const coord = parseCellAddress(ref);
    if (!coord) continue;
    const target = shift(coord);
    if (!target) continue; // dropped (e.g., deleted row/col)
    next[cellAddress(target.row, target.col)] = cell;
  }
  return next;
}

function shiftCoord(
  c: Coord,
  axis: 'row' | 'col',
  at: number,
  delta: number,
  newLimit: number,
): Coord {
  const v = c[axis];
  if (delta > 0) return v >= at ? { ...c, [axis]: v + 1 } : c;
  if (v === at) return { ...c, [axis]: Math.min(at, newLimit) };
  if (v > at) return { ...c, [axis]: v - 1 };
  return c;
}

function shiftRange(
  r: Range,
  axis: 'row' | 'col',
  at: number,
  delta: number,
  newLimit: number,
): Range {
  return normalizeRange({
    start: shiftCoord(r.start, axis, at, delta, newLimit),
    end: shiftCoord(r.end, axis, at, delta, newLimit),
  });
}

export function shiftSelectionAfterMutation(
  sel: Selection,
  axis: 'row' | 'col',
  at: number,
  delta: number,
  newLimit: number,
): Selection {
  return {
    ...sel,
    anchor: shiftCoord(sel.anchor, axis, at, delta, newLimit),
    focus: shiftCoord(sel.focus, axis, at, delta, newLimit),
    ranges: sel.ranges.map((r) => shiftRange(r, axis, at, delta, newLimit)),
  };
}

export function shiftEditingAfterMutation(
  editing: EditingState | null,
  axis: 'row' | 'col',
  at: number,
  delta: number,
): EditingState | null {
  if (!editing) return null;
  const v = editing[axis];
  if (delta > 0) return v >= at ? { ...editing, [axis]: v + 1 } : editing;
  if (v === at) return null;
  if (v > at) return { ...editing, [axis]: v - 1 };
  return editing;
}

export function emptyInitialSelection(): Selection {
  return {
    anchor: { row: 0, col: 0 },
    focus: { row: 0, col: 0 },
    ranges: [singleCellRange(0, 0)],
    mode: 'cell',
  };
}
