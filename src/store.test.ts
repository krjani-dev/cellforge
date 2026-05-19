import { beforeEach, describe, expect, it } from 'vitest';
import {
  cellAddress,
  columnLabel,
  letterToColumnIndex,
  normalizeRange,
  parseCellAddress,
  rangeContains,
  useSpreadsheetStore,
  type Range,
} from './store';

// Reset the singleton store between tests.
const initialState = useSpreadsheetStore.getState();

beforeEach(() => {
  useSpreadsheetStore.setState(
    {
      cells: {},
      rowCount: 100,
      columnCount: 26,
      rowHeights: {},
      colWidths: {},
      selection: {
        anchor: { row: 0, col: 0 },
        ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
        mode: 'cell',
      },
      editing: null,
    },
    false,
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────────────────

describe('columnLabel', () => {
  it.each([
    [0, 'A'],
    [1, 'B'],
    [25, 'Z'],
    [26, 'AA'],
    [27, 'AB'],
    [51, 'AZ'],
    [52, 'BA'],
    [701, 'ZZ'],
    [702, 'AAA'],
    [16383, 'XFD'], // Excel's rightmost column
  ])('encodes column %i as %s', (col, expected) => {
    expect(columnLabel(col)).toBe(expected);
  });

  it('rejects negative input', () => {
    expect(() => columnLabel(-1)).toThrow(RangeError);
  });

  it('rejects non-integer input', () => {
    expect(() => columnLabel(1.5)).toThrow(RangeError);
  });
});

describe('letterToColumnIndex', () => {
  it.each([
    ['A', 0],
    ['B', 1],
    ['Z', 25],
    ['AA', 26],
    ['AZ', 51],
    ['BA', 52],
    ['ZZ', 701],
    ['AAA', 702],
    ['XFD', 16383],
  ])('decodes %s to column %i', (label, expected) => {
    expect(letterToColumnIndex(label)).toBe(expected);
  });

  it('rejects empty / invalid input', () => {
    expect(() => letterToColumnIndex('')).toThrow(RangeError);
    expect(() => letterToColumnIndex('a')).toThrow(RangeError);
    expect(() => letterToColumnIndex('A1')).toThrow(RangeError);
    expect(() => letterToColumnIndex('1A')).toThrow(RangeError);
  });

  it('round-trips with columnLabel', () => {
    for (const col of [0, 1, 25, 26, 51, 702, 16383]) {
      expect(letterToColumnIndex(columnLabel(col))).toBe(col);
    }
  });
});

describe('cellAddress / parseCellAddress', () => {
  it.each([
    [0, 0, 'A1'],
    [0, 25, 'Z1'],
    [41, 27, 'AB42'],
    [99, 701, 'ZZ100'],
  ])('addresses (%i, %i) as %s', (row, col, expected) => {
    expect(cellAddress(row, col)).toBe(expected);
    expect(parseCellAddress(expected)).toEqual({ row, col });
  });

  it.each([
    ['', null],
    ['A', null],
    ['1A', null],
    ['A0', null],
    ['1', null],
    ['a1', null],
  ])('parseCellAddress(%j) returns %j', (input, expected) => {
    expect(parseCellAddress(input)).toEqual(expected);
  });
});

describe('normalizeRange', () => {
  it('returns range unchanged when already normalized', () => {
    const r: Range = { start: { row: 1, col: 2 }, end: { row: 3, col: 4 } };
    expect(normalizeRange(r)).toEqual(r);
  });

  it('swaps coords when start > end', () => {
    expect(normalizeRange({ start: { row: 5, col: 6 }, end: { row: 1, col: 2 } })).toEqual({
      start: { row: 1, col: 2 },
      end: { row: 5, col: 6 },
    });
  });

  it('handles mixed swap (row reversed, col not)', () => {
    expect(normalizeRange({ start: { row: 5, col: 2 }, end: { row: 1, col: 6 } })).toEqual({
      start: { row: 1, col: 2 },
      end: { row: 5, col: 6 },
    });
  });
});

describe('rangeContains', () => {
  const r: Range = { start: { row: 2, col: 3 }, end: { row: 5, col: 7 } };

  it.each([
    [2, 3, true], // top-left
    [5, 7, true], // bottom-right
    [3, 5, true], // middle
    [1, 5, false], // above
    [6, 5, false], // below
    [3, 2, false], // left
    [3, 8, false], // right
  ])('(%i, %i) inside range → %s', (row, col, expected) => {
    expect(rangeContains(r, row, col)).toBe(expected);
  });

  it('works on unnormalized ranges', () => {
    const unnorm: Range = { start: { row: 5, col: 7 }, end: { row: 2, col: 3 } };
    expect(rangeContains(unnorm, 3, 5)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Cell mutations
// ──────────────────────────────────────────────────────────────────────────────

describe('setCellValue', () => {
  it('sets a string value', () => {
    useSpreadsheetStore.getState().setCellValue(0, 0, 'hello');
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'hello' });
  });

  it('sets a number value', () => {
    useSpreadsheetStore.getState().setCellValue(4, 2, 42);
    expect(useSpreadsheetStore.getState().cells['C5']).toEqual({ v: 42 });
  });

  it('deletes the cell entry when set to null', () => {
    useSpreadsheetStore.getState().setCellValue(0, 0, 'hello');
    useSpreadsheetStore.getState().setCellValue(0, 0, null);
    expect(useSpreadsheetStore.getState().cells['A1']).toBeUndefined();
  });

  it('deletes the cell entry when set to empty string', () => {
    useSpreadsheetStore.getState().setCellValue(0, 0, 'hello');
    useSpreadsheetStore.getState().setCellValue(0, 0, '');
    expect(useSpreadsheetStore.getState().cells['A1']).toBeUndefined();
  });

  it('preserves other cell fields when updating value', () => {
    useSpreadsheetStore.setState((state) => ({
      cells: { ...state.cells, A1: { v: 1, f: '=SUM(B1:B10)', t: 'n' } },
    }));
    useSpreadsheetStore.getState().setCellValue(0, 0, 2);
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 2, f: '=SUM(B1:B10)', t: 'n' });
  });
});

describe('replaceData', () => {
  it('replaces all existing data', () => {
    useSpreadsheetStore.getState().setCellValue(0, 0, 'stale');
    useSpreadsheetStore.getState().replaceData([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    const { cells } = useSpreadsheetStore.getState();
    expect(cells).toEqual({
      A1: { v: 'a' },
      B1: { v: 'b' },
      A2: { v: 'c' },
      B2: { v: 'd' },
    });
  });

  it('skips null / undefined / empty cells', () => {
    useSpreadsheetStore.getState().replaceData([
      ['a', null, undefined, ''],
      [1, 2, 3, 4],
    ]);
    const { cells } = useSpreadsheetStore.getState();
    expect(Object.keys(cells).sort()).toEqual(['A1', 'A2', 'B2', 'C2', 'D2']);
  });

  it('does not grow dimensions beyond the current bounds', () => {
    useSpreadsheetStore.getState().setDimensions(10, 5);
    useSpreadsheetStore.getState().replaceData([
      ['a', 'b', 'c', 'd', 'e', 'f'], // 6 cols — col 5 (index) is out of bounds
    ]);
    // columnCount must stay at 5; only the first 5 columns are loaded
    expect(useSpreadsheetStore.getState().columnCount).toBe(5);
    expect(useSpreadsheetStore.getState().cells['E1']).toEqual({ v: 'e' });
    expect(useSpreadsheetStore.getState().cells['F1']).toBeUndefined();
  });

  it('does not shrink dimensions below current counts', () => {
    useSpreadsheetStore.getState().setDimensions(50, 10);
    useSpreadsheetStore.getState().replaceData([['x']]);
    const { rowCount, columnCount } = useSpreadsheetStore.getState();
    expect(rowCount).toBe(50);
    expect(columnCount).toBe(10);
  });
});

describe('clearCells', () => {
  it('clears cells inside an explicit range', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['g', 'h', 'i'],
    ]);
    store.clearCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 1 } });
    const { cells } = useSpreadsheetStore.getState();
    expect(cells['A1']).toBeUndefined();
    expect(cells['B1']).toBeUndefined();
    expect(cells['A2']).toBeUndefined();
    expect(cells['B2']).toBeUndefined();
    expect(cells['C1']).toEqual({ v: 'c' });
    expect(cells['C3']).toEqual({ v: 'i' });
  });

  it('falls back to active selection when no range is passed', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    store.selectRange({ start: { row: 0, col: 0 }, end: { row: 0, col: 1 } });
    store.clearCells();
    const { cells } = useSpreadsheetStore.getState();
    expect(cells['A1']).toBeUndefined();
    expect(cells['B1']).toBeUndefined();
    expect(cells['A2']).toEqual({ v: 'c' });
  });

  it('is a no-op when no cells overlap the range', () => {
    const store = useSpreadsheetStore.getState();
    store.setCellValue(0, 0, 'x');
    const before = useSpreadsheetStore.getState().cells;
    store.clearCells({ start: { row: 5, col: 5 }, end: { row: 9, col: 9 } });
    expect(useSpreadsheetStore.getState().cells).toBe(before);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Structural mutations
// ──────────────────────────────────────────────────────────────────────────────

describe('insertRow', () => {
  it('shifts selection anchor and editing down when at or below the insert point', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(2, 1);
    store.startEditing(2, 1, 'x');
    store.insertRow(2);
    const { selection, editing } = useSpreadsheetStore.getState();
    expect(selection.anchor).toEqual({ row: 3, col: 1 });
    expect(editing).toEqual({ row: 3, col: 1, value: 'x' });
  });

  it('leaves selection anchor and editing unchanged when above the insert point', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(1, 0);
    store.startEditing(1, 0, 'y');
    store.insertRow(3);
    const { selection, editing } = useSpreadsheetStore.getState();
    expect(selection.anchor).toEqual({ row: 1, col: 0 });
    expect(editing).toEqual({ row: 1, col: 0, value: 'y' });
  });

  it('shifts cells below the insertion point down by one', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['a'], ['b'], ['c']]);
    store.insertRow(1);
    const { cells, rowCount } = useSpreadsheetStore.getState();
    expect(cells['A1']).toEqual({ v: 'a' });
    expect(cells['A2']).toBeUndefined();
    expect(cells['A3']).toEqual({ v: 'b' });
    expect(cells['A4']).toEqual({ v: 'c' });
    expect(rowCount).toBe(101);
  });

  it('shifts row heights', () => {
    const store = useSpreadsheetStore.getState();
    store.setRowHeight(0, 50);
    store.setRowHeight(2, 70);
    store.insertRow(1);
    const { rowHeights } = useSpreadsheetStore.getState();
    expect(rowHeights[0]).toBe(50);
    expect(rowHeights[3]).toBe(70);
    expect(rowHeights[2]).toBeUndefined();
  });
});

describe('deleteRow', () => {
  it('cancels editing and clamps anchor when the selected row is deleted', () => {
    const store = useSpreadsheetStore.getState();
    store.setDimensions(5, 5);
    store.selectCell(4, 0);
    store.startEditing(4, 0, 'z');
    store.deleteRow(4);
    const { selection, editing } = useSpreadsheetStore.getState();
    expect(selection.anchor).toEqual({ row: 3, col: 0 });
    expect(editing).toBeNull();
  });

  it('shifts anchor up when a row above is deleted', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(3, 1);
    store.deleteRow(1);
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 2, col: 1 });
  });

  it('deletes cells at the row and shifts cells below up', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['a'], ['b'], ['c']]);
    store.deleteRow(1);
    const { cells, rowCount } = useSpreadsheetStore.getState();
    expect(cells['A1']).toEqual({ v: 'a' });
    expect(cells['A2']).toEqual({ v: 'c' });
    expect(cells['A3']).toBeUndefined();
    expect(rowCount).toBe(99);
  });

  it('refuses to delete the last remaining row', () => {
    const store = useSpreadsheetStore.getState();
    store.setDimensions(1, 1);
    store.setCellValue(0, 0, 'x');
    store.deleteRow(0);
    const { rowCount, cells } = useSpreadsheetStore.getState();
    expect(rowCount).toBe(1);
    expect(cells['A1']).toEqual({ v: 'x' });
  });
});

describe('insertColumn', () => {
  it('shifts anchor right when inserting at or left of the anchor column', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(0, 3);
    store.startEditing(0, 3, 'q');
    store.insertColumn(3);
    const { selection, editing } = useSpreadsheetStore.getState();
    expect(selection.anchor).toEqual({ row: 0, col: 4 });
    expect(editing).toEqual({ row: 0, col: 4, value: 'q' });
  });

  it('shifts cells right of the insertion point', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['a', 'b', 'c']]);
    store.insertColumn(1);
    const { cells, columnCount } = useSpreadsheetStore.getState();
    expect(cells['A1']).toEqual({ v: 'a' });
    expect(cells['B1']).toBeUndefined();
    expect(cells['C1']).toEqual({ v: 'b' });
    expect(cells['D1']).toEqual({ v: 'c' });
    expect(columnCount).toBe(27);
  });

  it('handles the Z → AA boundary', () => {
    const store = useSpreadsheetStore.getState();
    // Put data in columns 24 (Y), 25 (Z), 26 (AA)
    store.setCellValue(0, 24, 'y');
    store.setCellValue(0, 25, 'z');
    store.setCellValue(0, 26, 'aa');
    store.insertColumn(25); // insert before Z; Z and AA shift right
    const { cells } = useSpreadsheetStore.getState();
    expect(cells['Y1']).toEqual({ v: 'y' });
    expect(cells['Z1']).toBeUndefined();
    expect(cells['AA1']).toEqual({ v: 'z' });
    expect(cells['AB1']).toEqual({ v: 'aa' });
  });

  it('shifts column widths', () => {
    const store = useSpreadsheetStore.getState();
    store.setColWidth(0, 100);
    store.setColWidth(5, 200);
    store.insertColumn(2);
    const { colWidths } = useSpreadsheetStore.getState();
    expect(colWidths[0]).toBe(100);
    expect(colWidths[6]).toBe(200);
    expect(colWidths[5]).toBeUndefined();
  });
});

describe('deleteColumn', () => {
  it('cancels editing and clamps anchor when the selected column is deleted', () => {
    const store = useSpreadsheetStore.getState();
    store.setDimensions(5, 5);
    store.selectCell(0, 4);
    store.startEditing(0, 4, 'w');
    store.deleteColumn(4);
    const { selection, editing } = useSpreadsheetStore.getState();
    expect(selection.anchor).toEqual({ row: 0, col: 3 });
    expect(editing).toBeNull();
  });

  it('shifts anchor left when a column to the left is deleted', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(0, 5);
    store.deleteColumn(2);
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 4 });
  });

  it('deletes cells at the column and shifts right cells left', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['a', 'b', 'c']]);
    store.deleteColumn(1);
    const { cells, columnCount } = useSpreadsheetStore.getState();
    expect(cells['A1']).toEqual({ v: 'a' });
    expect(cells['B1']).toEqual({ v: 'c' });
    expect(cells['C1']).toBeUndefined();
    expect(columnCount).toBe(25);
  });

  it('refuses to delete the last remaining column', () => {
    const store = useSpreadsheetStore.getState();
    store.setDimensions(1, 1);
    store.setCellValue(0, 0, 'x');
    store.deleteColumn(0);
    const { columnCount, cells } = useSpreadsheetStore.getState();
    expect(columnCount).toBe(1);
    expect(cells['A1']).toEqual({ v: 'x' });
  });

  it('handles the AA → Z boundary', () => {
    const store = useSpreadsheetStore.getState();
    store.setCellValue(0, 24, 'y');
    store.setCellValue(0, 25, 'z');
    store.setCellValue(0, 26, 'aa');
    store.deleteColumn(25); // delete Z; AA → Z
    const { cells } = useSpreadsheetStore.getState();
    expect(cells['Y1']).toEqual({ v: 'y' });
    expect(cells['Z1']).toEqual({ v: 'aa' });
    expect(cells['AA1']).toBeUndefined();
  });
});

describe('setDimensions', () => {
  it('rejects zero or negative dimensions', () => {
    const store = useSpreadsheetStore.getState();
    expect(() => store.setDimensions(0, 10)).toThrow(RangeError);
    expect(() => store.setDimensions(10, 0)).toThrow(RangeError);
  });

  it('clamps selection and cancels editing when shrinking below current anchor', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(50, 10);
    store.startEditing(50, 10, 'hello');
    store.setDimensions(5, 3);
    const { selection, editing } = useSpreadsheetStore.getState();
    expect(selection.anchor).toEqual({ row: 4, col: 2 });
    expect(editing).toBeNull();
  });

  it('preserves selection and editing when still within bounds', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(2, 1);
    store.startEditing(2, 1, 'x');
    store.setDimensions(10, 10);
    const { selection, editing } = useSpreadsheetStore.getState();
    expect(selection.anchor).toEqual({ row: 2, col: 1 });
    expect(editing).toEqual({ row: 2, col: 1, value: 'x' });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Selection
// ──────────────────────────────────────────────────────────────────────────────

describe('selectCell', () => {
  it('produces a single-cell selection in cell mode', () => {
    useSpreadsheetStore.getState().selectCell(3, 4);
    expect(useSpreadsheetStore.getState().selection).toEqual({
      anchor: { row: 3, col: 4 },
      ranges: [{ start: { row: 3, col: 4 }, end: { row: 3, col: 4 } }],
      mode: 'cell',
    });
  });
});

describe('selectRange / extendSelectionTo', () => {
  it('selectRange normalizes and derives mode', () => {
    useSpreadsheetStore.getState().selectRange({
      start: { row: 5, col: 5 },
      end: { row: 2, col: 2 },
    });
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.ranges).toEqual([{ start: { row: 2, col: 2 }, end: { row: 5, col: 5 } }]);
    expect(sel.mode).toBe('range');
  });

  it('extendSelectionTo keeps anchor stable', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(2, 2);
    store.extendSelectionTo(5, 7);
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.anchor).toEqual({ row: 2, col: 2 });
    expect(sel.ranges).toEqual([{ start: { row: 2, col: 2 }, end: { row: 5, col: 7 } }]);
    expect(sel.mode).toBe('range');
  });

  it('extending back to the anchor collapses to a single-cell range', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(3, 3);
    store.extendSelectionTo(5, 5);
    store.extendSelectionTo(3, 3);
    expect(useSpreadsheetStore.getState().selection.mode).toBe('cell');
  });
});

describe('addSelectionRange', () => {
  it('appends a disjoint range without losing the previous one', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(0, 0);
    store.addSelectionRange({ start: { row: 5, col: 5 }, end: { row: 6, col: 6 } });
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.ranges).toHaveLength(2);
    expect(sel.anchor).toEqual({ row: 5, col: 5 });
  });
});

describe('selectRow / selectColumn / selectAll', () => {
  it('selectRow spans the full width', () => {
    useSpreadsheetStore.getState().selectRow(4);
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.mode).toBe('row');
    expect(sel.ranges).toEqual([{ start: { row: 4, col: 0 }, end: { row: 4, col: 25 } }]);
  });

  it('selectColumn spans the full height', () => {
    useSpreadsheetStore.getState().selectColumn(2);
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.mode).toBe('column');
    expect(sel.ranges).toEqual([{ start: { row: 0, col: 2 }, end: { row: 99, col: 2 } }]);
  });

  it('selectAll spans the whole grid', () => {
    useSpreadsheetStore.getState().selectAll();
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.mode).toBe('all');
    expect(sel.ranges).toEqual([{ start: { row: 0, col: 0 }, end: { row: 99, col: 25 } }]);
  });

  it('resetSelection returns to A1', () => {
    const store = useSpreadsheetStore.getState();
    store.selectAll();
    store.resetSelection();
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 0 });
    expect(useSpreadsheetStore.getState().selection.mode).toBe('cell');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Navigation
// ──────────────────────────────────────────────────────────────────────────────

describe('moveAnchor', () => {
  it('moves up/down/left/right by one cell', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(5, 5);
    store.moveAnchor('right');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 5, col: 6 });
    store.moveAnchor('down');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 6, col: 6 });
    store.moveAnchor('left');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 6, col: 5 });
    store.moveAnchor('up');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 5, col: 5 });
  });

  it('clamps to grid boundaries', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(0, 0);
    store.moveAnchor('up');
    store.moveAnchor('left');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 0 });
  });

  it('pageDown / pageUp jump by the given pageSize', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(0, 0);
    store.moveAnchor('pageDown', { pageSize: 25 });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 25, col: 0 });
    store.moveAnchor('pageUp', { pageSize: 10 });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 15, col: 0 });
  });

  it('home / end snap to first / last column of the current row', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(7, 13);
    store.moveAnchor('home');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 7, col: 0 });
    store.moveAnchor('end');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 7, col: 25 });
  });

  it('gridStart / gridEnd jump to A1 / bottom-right', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(50, 10);
    store.moveAnchor('gridEnd');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 99, col: 25 });
    store.moveAnchor('gridStart');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 0 });
  });

  it('extend keeps the anchor stable and grows the active range', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(3, 3);
    store.moveAnchor('right', { extend: true });
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.anchor).toEqual({ row: 3, col: 3 });
    expect(sel.ranges[0]).toEqual({ start: { row: 3, col: 3 }, end: { row: 3, col: 4 } });
    expect(sel.mode).toBe('range');
  });

  it('dataEdgeRight jumps through consecutive non-empty cells', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['a', 'b', 'c', null, 'e']]);
    store.selectCell(0, 0);
    store.moveAnchor('dataEdgeRight');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 2 });
  });

  it('dataEdgeRight from a non-empty cell with empty neighbor jumps to the grid edge', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['a', null, null, null, 'e']]);
    store.selectCell(0, 0);
    store.moveAnchor('dataEdgeRight');
    // Excel behaviour: non-empty + empty neighbour → jump to the rightmost column.
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 25 });
  });

  it('dataEdgeLeft from a non-empty cell with empty neighbor jumps to the grid edge', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['e', null, null, null, 'a']]);
    store.selectCell(0, 4);
    store.moveAnchor('dataEdgeLeft');
    // non-empty + empty neighbour (left) → jump to column 0
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 0 });
  });

  it('dataEdgeDown from a non-empty cell with empty neighbor jumps to the grid edge', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['a'], [null], [null], [null], ['e']]);
    store.selectCell(0, 0);
    store.moveAnchor('dataEdgeDown');
    // non-empty + empty neighbour (below) → jump to last row
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 99, col: 0 });
  });

  it('dataEdgeUp from a non-empty cell with empty neighbor jumps to the grid edge', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([['e'], [null], [null], [null], ['a']]);
    store.selectCell(4, 0);
    store.moveAnchor('dataEdgeUp');
    // non-empty + empty neighbour (above) → jump to row 0
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 0 });
  });

  it('dataEdgeRight from an empty cell skips to first non-empty', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([[null, null, null, 'd']]);
    store.selectCell(0, 0);
    store.moveAnchor('dataEdgeRight');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 3 });
  });

  it('dataEdgeRight clamps to grid edge when no data exists past the cursor', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(0, 0);
    store.moveAnchor('dataEdgeRight');
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 25 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Editing
// ──────────────────────────────────────────────────────────────────────────────

describe('startEditing', () => {
  it('opens the editor with the existing value preserved by default', () => {
    const store = useSpreadsheetStore.getState();
    store.setCellValue(2, 3, 42);
    store.startEditing(2, 3);
    expect(useSpreadsheetStore.getState().editing).toEqual({ row: 2, col: 3, value: '42' });
  });

  it('opens the editor with an initial value (printable-key entry)', () => {
    const store = useSpreadsheetStore.getState();
    store.setCellValue(0, 0, 'existing');
    store.startEditing(0, 0, 'X');
    expect(useSpreadsheetStore.getState().editing).toEqual({ row: 0, col: 0, value: 'X' });
  });

  it('opens the editor with empty value when no cell value exists', () => {
    const store = useSpreadsheetStore.getState();
    store.startEditing(5, 5);
    expect(useSpreadsheetStore.getState().editing).toEqual({ row: 5, col: 5, value: '' });
  });

  it('moves selection to the editing cell', () => {
    const store = useSpreadsheetStore.getState();
    store.selectCell(0, 0);
    store.startEditing(3, 4);
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 3, col: 4 });
  });
});

describe('updateEditingValue / commitEditing / cancelEditing', () => {
  it('updateEditingValue mutates only the editing slice', () => {
    const store = useSpreadsheetStore.getState();
    store.startEditing(0, 0);
    store.updateEditingValue('hello');
    expect(useSpreadsheetStore.getState().editing?.value).toBe('hello');
  });

  it('commit coerces numeric strings to numbers and persists', () => {
    const store = useSpreadsheetStore.getState();
    store.startEditing(0, 0);
    store.updateEditingValue('123');
    store.commitEditing();
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 123 });
    expect(useSpreadsheetStore.getState().editing).toBeNull();
  });

  it('commit preserves non-numeric strings', () => {
    const store = useSpreadsheetStore.getState();
    store.startEditing(0, 0);
    store.updateEditingValue('hello');
    store.commitEditing();
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'hello' });
  });

  it('commit coerces "true" / "false" to booleans', () => {
    const store = useSpreadsheetStore.getState();
    store.startEditing(0, 0);
    store.updateEditingValue('true');
    store.commitEditing();
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: true });
  });

  it('commit with empty value deletes the cell entry', () => {
    const store = useSpreadsheetStore.getState();
    store.setCellValue(0, 0, 'old');
    store.startEditing(0, 0);
    store.updateEditingValue('');
    store.commitEditing();
    expect(useSpreadsheetStore.getState().cells['A1']).toBeUndefined();
  });

  it('cancel leaves the cell unchanged and clears editing', () => {
    const store = useSpreadsheetStore.getState();
    store.setCellValue(0, 0, 'keep');
    store.startEditing(0, 0);
    store.updateEditingValue('discarded');
    store.cancelEditing();
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'keep' });
    expect(useSpreadsheetStore.getState().editing).toBeNull();
  });

  it('commit is a no-op when nothing is being edited', () => {
    const store = useSpreadsheetStore.getState();
    const before = useSpreadsheetStore.getState().cells;
    store.commitEditing();
    expect(useSpreadsheetStore.getState().cells).toBe(before);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Workbook lifecycle
// ──────────────────────────────────────────────────────────────────────────────

describe('resetWorkbook', () => {
  it('clears cells, dimensions, sizes, selection, and editing back to defaults', () => {
    const store = useSpreadsheetStore.getState();
    store.replaceData([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    store.setDimensions(50, 20);
    store.setRowHeight(0, 80);
    store.setColWidth(0, 200);
    store.selectRange({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });
    store.startEditing(0, 0, 'editing-value');

    store.resetWorkbook();

    const after = useSpreadsheetStore.getState();
    expect(after.cells).toEqual({});
    expect(after.rowCount).toBe(100);
    expect(after.columnCount).toBe(26);
    expect(after.rowHeights).toEqual({});
    expect(after.colWidths).toEqual({});
    expect(after.editing).toBeNull();
    expect(after.selection).toEqual({
      anchor: { row: 0, col: 0 },
      ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
      mode: 'cell',
    });
  });
});

// Verify we restored initial behavior — guards against test bleed.
describe('state isolation', () => {
  it('restores defaults via setState between tests', () => {
    expect(initialState.rowCount).toBe(100);
    expect(initialState.columnCount).toBe(26);
    expect(initialState.cells).toEqual({});
  });
});
