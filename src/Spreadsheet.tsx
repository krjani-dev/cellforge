import './styles.css';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect } from 'react';

import { Grid } from './grid/Grid';
import type { CellValue, CellRef } from './store';
import { useSpreadsheetStore, parseCellAddress } from './store';

export interface SpreadsheetHandle {
  /** Returns a snapshot of all cell values as a dense 2D array (row-major). */
  getData(): CellValue[][];
}

export interface SpreadsheetProps {
  className?: string;
  /**
   * Initial cell data. Each inner array is a row, each entry a cell value.
   * Loaded into the workbook store on first mount only — later changes to
   * this prop are ignored. The store is the source of truth after mount.
   * To reload data, remount the component (change its `key`).
   */
  initialData?: ReadonlyArray<ReadonlyArray<CellValue | undefined | null>>;
  /**
   * Number of visible rows. Defaults to 100. Clamped to a minimum of 1.
   * This defines the exact grid height — it is not a floor that the grid
   * can grow beyond automatically.
   */
  rows?: number;
  /**
   * Number of visible columns. Defaults to 26. Clamped to a minimum of 1.
   * This defines the exact grid width — it is not a floor that the grid
   * can grow beyond automatically.
   */
  columns?: number;
  /**
   * Called whenever cell data changes (user edits, paste, clear, row/column
   * insert/delete). Receives a dense 2D snapshot of all cell values.
   * Not called for selection or dimension changes.
   */
  onDataChange?: (data: CellValue[][]) => void;
}

function toCellArray(
  cells: Record<CellRef, { v?: CellValue }>,
  rowCount: number,
  columnCount: number,
): CellValue[][] {
  const out: CellValue[][] = Array.from({ length: rowCount }, () =>
    new Array<CellValue>(columnCount).fill(null),
  );
  for (const [ref, cell] of Object.entries(cells)) {
    const coord = parseCellAddress(ref as CellRef);
    if (!coord || coord.row >= rowCount || coord.col >= columnCount) continue;
    out[coord.row]![coord.col] = cell.v ?? null;
  }
  return out;
}

/**
 * Single-instance limitation: the workbook state is a singleton. Mounting two
 * `<Spreadsheet>` components on the same page will cause them to share state
 * and overwrite each other. Multi-instance support (via a per-instance Context
 * provider) is a planned future enhancement.
 */
export const Spreadsheet = forwardRef<SpreadsheetHandle, SpreadsheetProps>(function Spreadsheet(
  { className, initialData, rows, columns, onDataChange },
  ref,
) {
  // useLayoutEffect runs synchronously after DOM mutation but before paint,
  // preventing a flash of stale or empty workbook state on mount.

  // Reset on mount so state from a previous mount doesn't bleed in.
  useLayoutEffect(() => {
    useSpreadsheetStore.getState().resetWorkbook();
  }, []);

  // Apply dimensions on mount and whenever rows/columns props change.
  // 100/26 are the documented defaults (same values as resetWorkbook uses).
  useLayoutEffect(() => {
    useSpreadsheetStore
      .getState()
      .setDimensions(Math.max(rows ?? 100, 1), Math.max(columns ?? 26, 1));
  }, [rows, columns]);

  // Load initial data on mount, after dimensions have been applied above.
  useLayoutEffect(() => {
    if (initialData) {
      useSpreadsheetStore.getState().replaceData(initialData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    getData() {
      const { cells, rowCount, columnCount } = useSpreadsheetStore.getState();
      return toCellArray(cells, rowCount, columnCount);
    },
  }));

  useEffect(() => {
    if (!onDataChange) return;
    let prevCells = useSpreadsheetStore.getState().cells;
    return useSpreadsheetStore.subscribe((state) => {
      if (state.cells === prevCells) return;
      prevCells = state.cells;
      onDataChange(toCellArray(state.cells, state.rowCount, state.columnCount));
    });
  }, [onDataChange]);

  return (
    <div className={['cellforge-shell', className].filter(Boolean).join(' ')}>
      <Grid />
    </div>
  );
});
