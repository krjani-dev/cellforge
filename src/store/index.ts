/**
 * cellforge workbook store (single-sheet, single-instance).
 *
 * Design notes:
 * - Cells are stored sparsely as a Record keyed by A1 strings ("A1", "AB42").
 *   Strings hash faster in V8 than {row, col} objects and serialize cheaper.
 * - Internal coordinates are 0-indexed. A1 addresses are 1-indexed at the boundary.
 *   Conversion lives in `cellAddress` / `parseCellAddress` only — every other
 *   function takes/returns numeric coords.
 * - Selection holds an `anchor` (the cell the user clicked first) plus one or
 *   more `ranges`. The LAST range is the "active" one — keyboard nav extends it.
 * - The store is a singleton. When multi-sheet workbooks and multiple Spreadsheet
 *   instances per page are added, the singleton hook will be replaced with a
 *   React Context + per-instance factory. The public action signatures stay the same.
 */
import { create } from 'zustand';

import type { CellValue, Cell, CellRef, SpreadsheetState } from './types';
import { cellAddress, normalizeRange, parseCellAddress, rangeContains } from './addressing';
import {
  cellRange,
  singleCellRange,
  deriveSelectionMode,
  shiftIndexMap,
  rekeyCells,
  shiftSelectionAfterMutation,
  shiftEditingAfterMutation,
  emptyInitialSelection,
} from './selection';
import { navTarget } from './navigation';

// Backward-compat re-exports so existing consumers continue to work unchanged.
export type {
  CellValue,
  CellType,
  Cell,
  CellRef,
  Coord,
  Range,
  SelectionMode,
  Selection,
  NavDirection,
  NavOptions,
  EditingState,
  SpreadsheetState,
} from './types';
export {
  columnLabel,
  letterToColumnIndex,
  cellAddress,
  parseCellAddress,
  normalizeRange,
  rangeContains,
} from './addressing';

// ──────────────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_ROW_COUNT = 100;
const DEFAULT_COLUMN_COUNT = 26;

function coerceCellInput(value: string): CellValue {
  if (value === '') return null;
  // Try numeric coercion. Bare digits / decimals / signs / scientific notation become numbers;
  // everything else stays as a string. Date/formula handling is a future enhancement.
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  cells: {},
  rowCount: DEFAULT_ROW_COUNT,
  columnCount: DEFAULT_COLUMN_COUNT,
  rowHeights: {},
  colWidths: {},
  selection: emptyInitialSelection(),
  editing: null,

  // ─── cells ─────────────────────────────────────────────────────────────────

  setCellValue: (row, col, value) => {
    set((state) => {
      const ref = cellAddress(row, col);
      if (value === null || value === '') {
        // Sparse cleanup: empty value drops the entry entirely.
        if (!(ref in state.cells)) return state;
        const { [ref]: _drop, ...rest } = state.cells;
        return { cells: rest };
      }
      return {
        cells: { ...state.cells, [ref]: { ...state.cells[ref], v: value } },
      };
    });
  },

  clearCells: (range) => {
    const target = range ?? get().selection.ranges[get().selection.ranges.length - 1];
    if (!target) return;
    const n = normalizeRange(target);
    set((state) => {
      // Iterate stored cells (O(stored)) instead of every coordinate in the range
      // (O(range)), so clearing a large sparse selection stays fast.
      const toDelete = Object.keys(state.cells).filter((ref) => {
        const coord = parseCellAddress(ref as CellRef);
        return coord !== null && rangeContains(n, coord.row, coord.col);
      });
      if (toDelete.length === 0) return state;
      const next = { ...state.cells };
      for (const ref of toDelete) delete next[ref as CellRef];
      return { cells: next };
    });
  },

  replaceData: (data) => {
    const { rowCount, columnCount } = get();
    const nextCells: Record<CellRef, Cell> = {};
    data.forEach((row, rowIndex) => {
      if (rowIndex >= rowCount) return;
      row.forEach((value, colIndex) => {
        if (colIndex >= columnCount) return;
        if (value === undefined || value === null || value === '') return;
        nextCells[cellAddress(rowIndex, colIndex)] = { v: value };
      });
    });
    set({ cells: nextCells });
  },

  // ─── dimensions ────────────────────────────────────────────────────────────

  setDimensions: (rows, cols) => {
    if (rows < 1 || cols < 1) {
      throw new RangeError(`setDimensions: rows and cols must be >= 1 (got ${rows}, ${cols})`);
    }
    set((state) => {
      const rowMax = rows - 1;
      const colMax = cols - 1;

      // Drop cells and custom sizes that fall outside the new bounds.
      const prunedCells = Object.fromEntries(
        Object.entries(state.cells).filter(([ref]) => {
          const coord = parseCellAddress(ref as CellRef);
          return coord !== null && coord.row <= rowMax && coord.col <= colMax;
        }),
      ) as Record<CellRef, Cell>;

      const prunedRowHeights = Object.fromEntries(
        Object.entries(state.rowHeights).filter(([r]) => Number(r) <= rowMax),
      );
      const prunedColWidths = Object.fromEntries(
        Object.entries(state.colWidths).filter(([c]) => Number(c) <= colMax),
      );

      const anchor = {
        row: Math.min(state.selection.anchor.row, rowMax),
        col: Math.min(state.selection.anchor.col, colMax),
      };
      const focus = {
        row: Math.min(state.selection.focus.row, rowMax),
        col: Math.min(state.selection.focus.col, colMax),
      };
      const ranges = state.selection.ranges.map((r) =>
        normalizeRange({
          start: { row: Math.min(r.start.row, rowMax), col: Math.min(r.start.col, colMax) },
          end: { row: Math.min(r.end.row, rowMax), col: Math.min(r.end.col, colMax) },
        }),
      );
      const editing =
        state.editing && state.editing.row <= rowMax && state.editing.col <= colMax
          ? state.editing
          : null;
      return {
        cells: prunedCells,
        rowCount: rows,
        columnCount: cols,
        rowHeights: prunedRowHeights,
        colWidths: prunedColWidths,
        selection: { ...state.selection, anchor, focus, ranges },
        editing,
      };
    });
  },

  setRowHeight: (row, height) => {
    set((state) => ({ rowHeights: { ...state.rowHeights, [row]: height } }));
  },

  setColWidth: (col, width) => {
    set((state) => ({ colWidths: { ...state.colWidths, [col]: width } }));
  },

  insertRow: (at) => {
    set((state) => ({
      cells: rekeyCells(state.cells, (c) => (c.row >= at ? { row: c.row + 1, col: c.col } : c)),
      rowHeights: shiftIndexMap(state.rowHeights, at, +1),
      rowCount: state.rowCount + 1,
      selection: shiftSelectionAfterMutation(state.selection, 'row', at, +1, state.rowCount),
      editing: shiftEditingAfterMutation(state.editing, 'row', at, +1),
    }));
  },

  deleteRow: (at) => {
    set((state) => {
      if (state.rowCount <= 1) return state;
      const newRowCount = state.rowCount - 1;
      return {
        cells: rekeyCells(state.cells, (c) => {
          if (c.row === at) return null;
          if (c.row > at) return { row: c.row - 1, col: c.col };
          return c;
        }),
        rowHeights: shiftIndexMap(state.rowHeights, at, -1),
        rowCount: newRowCount,
        selection: shiftSelectionAfterMutation(state.selection, 'row', at, -1, newRowCount - 1),
        editing: shiftEditingAfterMutation(state.editing, 'row', at, -1),
      };
    });
  },

  insertColumn: (at) => {
    set((state) => ({
      cells: rekeyCells(state.cells, (c) => (c.col >= at ? { row: c.row, col: c.col + 1 } : c)),
      colWidths: shiftIndexMap(state.colWidths, at, +1),
      columnCount: state.columnCount + 1,
      selection: shiftSelectionAfterMutation(state.selection, 'col', at, +1, state.columnCount),
      editing: shiftEditingAfterMutation(state.editing, 'col', at, +1),
    }));
  },

  deleteColumn: (at) => {
    set((state) => {
      if (state.columnCount <= 1) return state;
      const newColumnCount = state.columnCount - 1;
      return {
        cells: rekeyCells(state.cells, (c) => {
          if (c.col === at) return null;
          if (c.col > at) return { row: c.row, col: c.col - 1 };
          return c;
        }),
        colWidths: shiftIndexMap(state.colWidths, at, -1),
        columnCount: newColumnCount,
        selection: shiftSelectionAfterMutation(state.selection, 'col', at, -1, newColumnCount - 1),
        editing: shiftEditingAfterMutation(state.editing, 'col', at, -1),
      };
    });
  },

  // ─── selection ─────────────────────────────────────────────────────────────

  selectCell: (row, col) => {
    set({
      selection: {
        anchor: { row, col },
        focus: { row, col },
        ranges: [singleCellRange(row, col)],
        mode: 'cell',
      },
    });
  },

  selectRange: (range, mode) => {
    const normalized = normalizeRange(range);
    const { rowCount, columnCount } = get();
    set({
      selection: {
        anchor: { ...range.start },
        focus: { ...range.end },
        ranges: [normalized],
        mode: mode ?? deriveSelectionMode(normalized, rowCount, columnCount),
      },
    });
  },

  extendSelectionTo: (row, col) => {
    const { selection, rowCount, columnCount } = get();
    const range = cellRange(selection.anchor, { row, col });
    set({
      selection: {
        anchor: selection.anchor,
        focus: { row, col },
        ranges: [...selection.ranges.slice(0, -1), range],
        mode: deriveSelectionMode(range, rowCount, columnCount),
      },
    });
  },

  addSelectionRange: (range) => {
    const normalized = normalizeRange(range);
    const { rowCount, columnCount } = get();
    set((state) => ({
      selection: {
        anchor: { ...range.start },
        focus: { ...range.end },
        ranges: [...state.selection.ranges, normalized],
        mode: deriveSelectionMode(normalized, rowCount, columnCount),
      },
    }));
  },

  selectRow: (row) => {
    const { columnCount } = get();
    set({
      selection: {
        anchor: { row, col: 0 },
        focus: { row, col: columnCount - 1 },
        ranges: [{ start: { row, col: 0 }, end: { row, col: columnCount - 1 } }],
        mode: 'row',
      },
    });
  },

  selectColumn: (col) => {
    const { rowCount } = get();
    set({
      selection: {
        anchor: { row: 0, col },
        focus: { row: rowCount - 1, col },
        ranges: [{ start: { row: 0, col }, end: { row: rowCount - 1, col } }],
        mode: 'column',
      },
    });
  },

  selectAll: () => {
    const { rowCount, columnCount, selection } = get();
    const activeCell = selection.anchor;
    set({
      selection: {
        anchor: { ...activeCell },
        focus: { ...activeCell },
        ranges: [{ start: { row: 0, col: 0 }, end: { row: rowCount - 1, col: columnCount - 1 } }],
        mode: 'all',
      },
    });
  },

  resetSelection: () => {
    set({ selection: emptyInitialSelection() });
  },

  moveAnchor: (direction, options) => {
    const { selection, cells, rowCount, columnCount } = get();
    const target = navTarget(
      { selection, cells, rowCount, columnCount },
      direction,
      options?.pageSize ?? 10,
    );

    if (options?.extend) {
      const anchor = selection.anchor;
      const range = normalizeRange({ start: anchor, end: target });
      set({
        selection: {
          anchor,
          focus: target,
          ranges: [...selection.ranges.slice(0, -1), range],
          mode: deriveSelectionMode(range, rowCount, columnCount),
        },
      });
      return;
    }

    set({
      selection: {
        anchor: target,
        focus: target,
        ranges: [singleCellRange(target.row, target.col)],
        mode: 'cell',
      },
    });
  },

  // ─── editing ───────────────────────────────────────────────────────────────

  startEditing: (row, col, initialValue) => {
    const { cells } = get();
    const existing = cells[cellAddress(row, col)]?.v;
    const value =
      initialValue !== undefined
        ? initialValue
        : existing === undefined || existing === null
          ? ''
          : String(existing);
    set({
      editing: { row, col, value },
      selection: {
        anchor: { row, col },
        focus: { row, col },
        ranges: [singleCellRange(row, col)],
        mode: 'cell',
      },
    });
  },

  updateEditingValue: (value) => {
    set((state) => (state.editing ? { editing: { ...state.editing, value } } : state));
  },

  commitEditing: () => {
    const { editing } = get();
    if (!editing) return;
    get().setCellValue(editing.row, editing.col, coerceCellInput(editing.value));
    set({ editing: null });
  },

  cancelEditing: () => {
    set({ editing: null });
  },

  // ─── workbook ─────────────────────────────────────────────────────────────

  resetWorkbook: () => {
    set({
      cells: {},
      rowCount: DEFAULT_ROW_COUNT,
      columnCount: DEFAULT_COLUMN_COUNT,
      rowHeights: {},
      colWidths: {},
      selection: emptyInitialSelection(),
      editing: null,
    });
  },
}));
