import './styles.css';
import { useEffect } from 'react';

import { Grid } from './grid/Grid';
import type { CellValue } from './store';
import { useSpreadsheetStore } from './store';

export interface SpreadsheetProps {
  className?: string;
  /**
   * Initial cell data. Each inner array is a row, each entry a cell value.
   * Loaded into the workbook store on first mount only — later changes to
   * this prop are ignored. The store is the source of truth after mount.
   * To reload data, remount the component (change its `key`). A controlled
   * data API with `onChange` is a future enhancement.
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
}

/**
 * Single-instance limitation: the workbook state is a singleton. Mounting two
 * `<Spreadsheet>` components on the same page will cause them to share state
 * and overwrite each other. Multi-instance support (via a per-instance Context
 * provider) is a planned future enhancement.
 */
export function Spreadsheet({ className, initialData, rows, columns }: SpreadsheetProps) {
  // Reset on mount so state from a previous mount doesn't bleed in.
  useEffect(() => {
    useSpreadsheetStore.getState().resetWorkbook();
  }, []);

  // Apply dimensions on mount and whenever rows/columns props change so
  // Storybook controls and prop updates are reflected immediately.
  // 100/26 are the documented defaults (same values as resetWorkbook uses).
  useEffect(() => {
    useSpreadsheetStore
      .getState()
      .setDimensions(Math.max(rows ?? 100, 1), Math.max(columns ?? 26, 1));
  }, [rows, columns]);

  // Load initial data on mount, after dimensions have been applied above.
  useEffect(() => {
    if (initialData) {
      useSpreadsheetStore.getState().replaceData(initialData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={['cellforge-shell', className].filter(Boolean).join(' ')}>
      <Grid />
    </div>
  );
}
