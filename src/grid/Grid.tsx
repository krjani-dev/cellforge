/**
 * Virtualized cell grid + sticky row/column headers + selection + keyboard
 * navigation + cell editor + context menu + resize handles.
 *
 * The cell viewport uses `react-window`'s `Grid` for virtualization.
 * Header strips are also virtualized: they render only the visible window
 * of headers (plus a small overscan buffer) derived from the cell viewport's
 * scroll position, which is forwarded to the strip components as a plain
 * numeric prop.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Grid as VirtualGrid, useGridRef } from 'react-window';
import type { GridImperativeAPI } from 'react-window';
import * as Menu from '@radix-ui/react-context-menu';

import { rangeContains, useSpreadsheetStore } from '../store';
import { Cell } from './Cell';
import { getColumnWidth, getRowHeight } from './constants';
import { ColumnHeaderStrip, RowHeaderStrip } from './Headers';
import {
  CellMenuContent,
  RowMenuContent,
  ColumnMenuContent,
  CornerMenuContent,
} from './ContextMenus';
import { handleKeyDown } from './keyboard';

const HEADER_HEIGHT = 24;
const HEADER_WIDTH = 48;

type CellExtras = Record<string, never>;

function readCoordFromDataset(el: HTMLElement | null): { row: number; col: number } | null {
  if (!el) return null;
  const row = Number(el.dataset.row);
  const col = Number(el.dataset.col);
  if (Number.isNaN(row) || Number.isNaN(col)) return null;
  return { row, col };
}

function locateCellFromEvent(
  event: MouseEvent<HTMLDivElement>,
): { row: number; col: number } | null {
  const target = event.target as HTMLElement | null;
  if (!target) return null;
  return readCoordFromDataset(target.closest<HTMLElement>('[data-row][data-col]'));
}

function readDataAttr(
  event: MouseEvent<HTMLDivElement>,
  attr: 'data-row' | 'data-col',
): number | null {
  const target = event.target as HTMLElement | null;
  const el = target?.closest<HTMLElement>(`[${attr}]`);
  if (!el) return null;
  const value = Number(el.getAttribute(attr));
  return Number.isNaN(value) ? null : value;
}

export function Grid() {
  const rowCount = useSpreadsheetStore((s) => s.rowCount);
  const columnCount = useSpreadsheetStore((s) => s.columnCount);
  const rowHeights = useSpreadsheetStore((s) => s.rowHeights);
  const colWidths = useSpreadsheetStore((s) => s.colWidths);
  const selectCell = useSpreadsheetStore((s) => s.selectCell);
  const extendSelectionTo = useSpreadsheetStore((s) => s.extendSelectionTo);
  const addSelectionRange = useSpreadsheetStore((s) => s.addSelectionRange);
  const selectAll = useSpreadsheetStore((s) => s.selectAll);
  const selectRow = useSpreadsheetStore((s) => s.selectRow);
  const selectColumn = useSpreadsheetStore((s) => s.selectColumn);
  const startEditing = useSpreadsheetStore((s) => s.startEditing);

  const gridRef = useGridRef(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const colStripRef = useRef<HTMLDivElement>(null);
  const rowStripRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const [colScrollLeft, setColScrollLeft] = useState(0);
  const [rowScrollTop, setRowScrollTop] = useState(0);

  const columnWidth = useCallback((index: number) => getColumnWidth(colWidths[index]), [colWidths]);
  const rowHeight = useCallback((index: number) => getRowHeight(rowHeights[index]), [rowHeights]);

  const syncHeaderScroll = useCallback(() => {
    const api = gridRef.current as GridImperativeAPI | null;
    const el = api?.element ?? null;
    if (!el) return;
    const sl = el.scrollLeft;
    const st = el.scrollTop;
    if (colStripRef.current) colStripRef.current.scrollLeft = sl;
    if (rowStripRef.current) rowStripRef.current.scrollTop = st;
    setColScrollLeft(sl);
    setRowScrollTop(st);
  }, [gridRef]);

  const syncScrollbarGutters = useCallback(() => {
    const api = gridRef.current as GridImperativeAPI | null;
    const el = api?.element ?? null;
    const root = rootRef.current;
    if (!el || !root) return;
    const scrollbarYWidth = Math.max(0, el.offsetWidth - el.clientWidth);
    const scrollbarXHeight = Math.max(0, el.offsetHeight - el.clientHeight);
    root.style.setProperty('--cf-scrollbar-y-w', `${scrollbarYWidth}px`);
    root.style.setProperty('--cf-scrollbar-x-h', `${scrollbarXHeight}px`);
  }, [gridRef]);

  useLayoutEffect(() => {
    syncScrollbarGutters();
  }, [columnCount, colWidths, rowCount, rowHeights, syncScrollbarGutters]);

  useEffect(() => {
    const sync = () => {
      const api = gridRef.current as GridImperativeAPI | null;
      const el = api?.element ?? null;
      if (!el) return;
      syncHeaderScroll();
      syncScrollbarGutters();
    };
    const api = gridRef.current as GridImperativeAPI | null;
    const el = api?.element ?? null;
    if (!el) return;
    sync();
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            sync();
          });
    resizeObserver?.observe(el);
    el.addEventListener('scroll', sync, { passive: true });
    return () => {
      resizeObserver?.disconnect();
      el.removeEventListener('scroll', sync);
    };
  }, [gridRef, syncHeaderScroll, syncScrollbarGutters]);

  const handleScroll = useCallback(() => {
    syncHeaderScroll();
    syncScrollbarGutters();
  }, [syncHeaderScroll, syncScrollbarGutters]);

  const focusRoot = useCallback(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const handleCellsMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const cell = locateCellFromEvent(event);
      if (!cell) return;
      if (event.shiftKey) {
        extendSelectionTo(cell.row, cell.col);
      } else if (event.ctrlKey || event.metaKey) {
        addSelectionRange({ start: cell, end: cell });
      } else {
        selectCell(cell.row, cell.col);
      }
      draggingRef.current = true;
      focusRoot();
    },
    [addSelectionRange, extendSelectionTo, focusRoot, selectCell],
  );

  const handleCellsMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      if (event.buttons === 0) {
        draggingRef.current = false;
        return;
      }
      const cell = locateCellFromEvent(event);
      if (!cell) return;
      extendSelectionTo(cell.row, cell.col);
    },
    [extendSelectionTo],
  );

  const handleCellsMouseUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleCellsDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const cell = locateCellFromEvent(event);
      if (!cell) return;
      startEditing(cell.row, cell.col);
    },
    [startEditing],
  );

  // Pre-select the right-clicked target so the context menu acts on it.
  const handleCellsContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const cell = locateCellFromEvent(event);
      if (!cell) return;
      const state = useSpreadsheetStore.getState();
      const inSelection = state.selection.ranges.some((range) =>
        rangeContains(range, cell.row, cell.col),
      );
      if (!inSelection) {
        selectCell(cell.row, cell.col);
      }
    },
    [selectCell],
  );

  const handleRowsContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const row = readDataAttr(event, 'data-row');
      if (row === null) return;
      selectRow(row);
    },
    [selectRow],
  );

  const handleColumnsContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const col = readDataAttr(event, 'data-col');
      if (col === null) return;
      selectColumn(col);
    },
    [selectColumn],
  );

  const handleCornerMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      selectAll();
      focusRoot();
    },
    [focusRoot, selectAll],
  );

  const handleCornerContextMenu = useCallback(() => {
    selectAll();
  }, [selectAll]);

  const cellProps = useMemo<CellExtras>(() => ({}), []);

  return (
    <div
      ref={rootRef}
      className="cellforge-root"
      role="grid"
      aria-label="Spreadsheet"
      data-testid="cellforge-spreadsheet"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={
        {
          '--cf-header-h': `${HEADER_HEIGHT}px`,
          '--cf-header-w': `${HEADER_WIDTH}px`,
          '--cf-scrollbar-y-w': '0px',
          '--cf-scrollbar-x-h': '0px',
        } as CSSProperties
      }
    >
      <Menu.Root>
        <Menu.Trigger asChild>
          <div
            className="cellforge-corner"
            aria-hidden="true"
            onMouseDown={handleCornerMouseDown}
            onContextMenu={handleCornerContextMenu}
          />
        </Menu.Trigger>
        <Menu.Portal>
          <CornerMenuContent />
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger asChild>
          <ColumnHeaderStrip
            stripRef={colStripRef}
            scrollOffset={colScrollLeft}
            onContextMenu={handleColumnsContextMenu}
          />
        </Menu.Trigger>
        <Menu.Portal>
          <ColumnMenuContent />
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger asChild>
          <RowHeaderStrip
            stripRef={rowStripRef}
            scrollOffset={rowScrollTop}
            onContextMenu={handleRowsContextMenu}
          />
        </Menu.Trigger>
        <Menu.Portal>
          <RowMenuContent />
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger asChild>
          <div
            className="cellforge-cells"
            onMouseDown={handleCellsMouseDown}
            onMouseMove={handleCellsMouseMove}
            onMouseUp={handleCellsMouseUp}
            onDoubleClick={handleCellsDoubleClick}
            onContextMenu={handleCellsContextMenu}
          >
            <VirtualGrid<CellExtras>
              gridRef={gridRef}
              cellComponent={Cell}
              cellProps={cellProps}
              rowCount={rowCount}
              columnCount={columnCount}
              rowHeight={rowHeight}
              columnWidth={columnWidth}
              defaultHeight={400}
              defaultWidth={600}
              onScroll={handleScroll}
            />
          </div>
        </Menu.Trigger>
        <Menu.Portal>
          <CellMenuContent />
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
