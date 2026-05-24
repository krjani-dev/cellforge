export type CellValue = string | number | boolean | null;

/** Type tag — declared for future typed I/O support; not yet populated. */
export type CellType = 'n' | 's' | 'b' | 'd' | 'e';

export interface Cell {
  /** Raw user value. `null` means an explicit empty (rare; usually the cell is just absent). */
  v?: CellValue;
  /** Formula source, e.g. `=SUM(A1:A10)`. Reserved for formula support; not yet used. */
  f?: string;
  /** Type tag, computed by the types module when typed I/O is enabled. */
  t?: CellType;
}

export type CellRef = string;

export interface Coord {
  row: number;
  col: number;
}

/** Inclusive rectangular range; `start` is always the top-left, `end` the bottom-right after normalization. */
export interface Range {
  start: Coord;
  end: Coord;
}

export type SelectionMode = 'cell' | 'range' | 'row' | 'column' | 'all';

export interface Selection {
  /** The cell the user clicked first; shift-extend keeps this fixed. */
  anchor: Coord;
  /** The moving end of the active selection (opposite corner from anchor).
   *  In 'cell' and 'range' modes the active range equals normalizeRange({start: anchor, end: focus}).
   *  In 'row', 'column', and 'all' modes anchor/focus track the active cell only;
   *  the actual selected cells are defined solely by `ranges`. */
  focus: Coord;
  /** Visible highlighted rectangles. The LAST entry is the active range. */
  ranges: Range[];
  mode: SelectionMode;
}

export type NavDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'pageUp'
  | 'pageDown'
  | 'home'
  | 'end'
  | 'gridStart'
  | 'gridEnd'
  | 'dataEdgeUp'
  | 'dataEdgeDown'
  | 'dataEdgeLeft'
  | 'dataEdgeRight';

export interface NavOptions {
  /** When true, extend the active range from `anchor` instead of creating a single-cell selection. */
  extend?: boolean;
  /** Rows per page for `pageUp` / `pageDown`. Defaults to 10. */
  pageSize?: number;
}

export interface EditingState {
  row: number;
  col: number;
  /** Live value inside the editor. Committed to `cells` on `commitEditing`. */
  value: string;
}

export interface SpreadsheetState {
  // ─── data ───
  cells: Record<CellRef, Cell>;
  rowCount: number;
  columnCount: number;
  rowHeights: Record<number, number>;
  colWidths: Record<number, number>;

  // ─── selection / editing ───
  selection: Selection;
  editing: EditingState | null;

  // ─── actions: cells ───
  setCellValue: (row: number, col: number, value: CellValue) => void;
  clearCells: (range?: Range) => void;
  replaceData: (data: ReadonlyArray<ReadonlyArray<CellValue | undefined | null>>) => void;

  // ─── actions: dimensions ───
  setDimensions: (rows: number, cols: number) => void;
  setRowHeight: (row: number, height: number) => void;
  setColWidth: (col: number, width: number) => void;
  insertRow: (at: number) => void;
  deleteRow: (at: number) => void;
  insertColumn: (at: number) => void;
  deleteColumn: (at: number) => void;

  // ─── actions: selection ───
  selectCell: (row: number, col: number) => void;
  selectRange: (range: Range, mode?: SelectionMode) => void;
  extendSelectionTo: (row: number, col: number) => void;
  addSelectionRange: (range: Range) => void;
  selectRow: (row: number) => void;
  selectColumn: (col: number) => void;
  selectAll: () => void;
  resetSelection: () => void;
  moveAnchor: (direction: NavDirection, options?: NavOptions) => void;

  // ─── actions: editing ───
  startEditing: (row: number, col: number, initialValue?: string) => void;
  updateEditingValue: (value: string) => void;
  commitEditing: () => void;
  cancelEditing: () => void;

  // ─── actions: workbook ───
  /** Reset all workbook data + selection + editing back to defaults. Useful
   *  when remounting a Spreadsheet (e.g., navigating between Storybook
   *  stories) — the singleton store otherwise carries state across mounts. */
  resetWorkbook: () => void;
}
