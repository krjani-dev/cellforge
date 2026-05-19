import type { CellRef, Cell, Coord, NavDirection, SpreadsheetState } from './types';
import { cellAddress } from './addressing';

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function hasCellValue(cells: Record<CellRef, Cell>, row: number, col: number): boolean {
  const cell = cells[cellAddress(row, col)];
  return cell !== undefined && cell.v !== undefined && cell.v !== null && cell.v !== '';
}

/** Walks from `start` in `step` direction until a value-state transition or the grid edge. */
function findDataEdge(
  cells: Record<CellRef, Cell>,
  start: Coord,
  step: { dr: number; dc: number },
  rowCount: number,
  columnCount: number,
): Coord {
  const inBounds = (row: number, col: number) =>
    row >= 0 && row < rowCount && col >= 0 && col < columnCount;

  let row = start.row + step.dr;
  let col = start.col + step.dc;
  if (!inBounds(row, col)) return start;

  const startHas = hasCellValue(cells, start.row, start.col);
  const neighborHas = hasCellValue(cells, row, col);

  if (startHas && neighborHas) {
    // Walk through consecutive non-empty cells; stop at the last non-empty before an empty.
    while (
      inBounds(row + step.dr, col + step.dc) &&
      hasCellValue(cells, row + step.dr, col + step.dc)
    ) {
      row += step.dr;
      col += step.dc;
    }
    return { row, col };
  }

  if (startHas && !neighborHas) {
    // Excel behaviour: jump straight to the grid edge in the direction of travel.
    return {
      row: clamp(start.row + step.dr * rowCount, 0, rowCount - 1),
      col: clamp(start.col + step.dc * columnCount, 0, columnCount - 1),
    };
  }

  // start is empty: skip empties until the first non-empty.
  while (inBounds(row, col) && !hasCellValue(cells, row, col)) {
    row += step.dr;
    col += step.dc;
  }
  if (!inBounds(row, col)) {
    return {
      row: clamp(row - step.dr, 0, rowCount - 1),
      col: clamp(col - step.dc, 0, columnCount - 1),
    };
  }
  return { row, col };
}

const NAV_STEPS: Record<
  'dataEdgeUp' | 'dataEdgeDown' | 'dataEdgeLeft' | 'dataEdgeRight',
  { dr: number; dc: number }
> = {
  dataEdgeUp: { dr: -1, dc: 0 },
  dataEdgeDown: { dr: 1, dc: 0 },
  dataEdgeLeft: { dr: 0, dc: -1 },
  dataEdgeRight: { dr: 0, dc: 1 },
};

export function navTarget(
  state: Pick<SpreadsheetState, 'selection' | 'cells' | 'rowCount' | 'columnCount'>,
  direction: NavDirection,
  pageSize: number,
): Coord {
  const lastRange = state.selection.ranges[state.selection.ranges.length - 1];
  const focus = lastRange ? lastRange.end : state.selection.anchor;

  switch (direction) {
    case 'up':
      return { row: clamp(focus.row - 1, 0, state.rowCount - 1), col: focus.col };
    case 'down':
      return { row: clamp(focus.row + 1, 0, state.rowCount - 1), col: focus.col };
    case 'left':
      return { row: focus.row, col: clamp(focus.col - 1, 0, state.columnCount - 1) };
    case 'right':
      return { row: focus.row, col: clamp(focus.col + 1, 0, state.columnCount - 1) };
    case 'pageUp':
      return { row: clamp(focus.row - pageSize, 0, state.rowCount - 1), col: focus.col };
    case 'pageDown':
      return { row: clamp(focus.row + pageSize, 0, state.rowCount - 1), col: focus.col };
    case 'home':
      return { row: focus.row, col: 0 };
    case 'end':
      return { row: focus.row, col: state.columnCount - 1 };
    case 'gridStart':
      return { row: 0, col: 0 };
    case 'gridEnd':
      return { row: state.rowCount - 1, col: state.columnCount - 1 };
    case 'dataEdgeUp':
    case 'dataEdgeDown':
    case 'dataEdgeLeft':
    case 'dataEdgeRight':
      return findDataEdge(
        state.cells,
        focus,
        NAV_STEPS[direction],
        state.rowCount,
        state.columnCount,
      );
    default: {
      const exhaustive: never = direction;
      throw new Error(`Unhandled NavDirection: ${String(exhaustive)}`);
    }
  }
}
