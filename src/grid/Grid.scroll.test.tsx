/**
 * Regression guard: selecting a full column, row, or all cells must NOT call
 * scrollToCell — the viewport should stay exactly where the user left it.
 *
 * Before the fix, selectColumn set focus to { row: rowCount-1, col } and the
 * scroll effect called scrollToCell with that coordinate, jumping the viewport
 * to the last row.  This file locks that behaviour down with an explicit spy.
 *
 * Implementation note — why a separate file?
 * vi.mock() is file-scoped in Vitest.  Replacing react-window's Grid here lets
 * us capture the scrollToCell spy without touching the existing integration
 * tests that rely on the real VirtualGrid to render cell elements.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ReactWindow from 'react-window';

import { Spreadsheet } from '../index';
import { useSpreadsheetStore } from '../store';

// ── spy setup ─────────────────────────────────────────────────────────────────

// vi.hoisted ensures the spy exists before the vi.mock factory runs (vi.mock
// calls are hoisted above imports by Vitest's transform).
const scrollToCellSpy = vi.hoisted(() => vi.fn());

// Replace react-window's VirtualGrid with a minimal stub that:
//  • populates gridRef.current with the scrollToCell spy (so Grid.tsx's
//    useEffect resolves the call path correctly), and
//  • renders nothing — cell elements are not needed for scroll tests.
//
// useLayoutEffect fires before useEffect, so the spy is always in place by
// the time Grid.tsx's passive effect tries to call scrollToCell.
vi.mock('react-window', async (importOriginal) => {
  const React = await import('react');
  const mod = await importOriginal<typeof ReactWindow>();
  return {
    ...mod,
    Grid: function MockGrid({ gridRef }: { gridRef: React.MutableRefObject<unknown> }) {
      React.useLayoutEffect(() => {
        gridRef.current = { scrollToCell: scrollToCellSpy, element: null };
      });
      return null;
    },
  };
});

// ── helpers ───────────────────────────────────────────────────────────────────

function resetStore() {
  useSpreadsheetStore.setState(
    {
      cells: {},
      rowCount: 100,
      columnCount: 26,
      rowHeights: {},
      colWidths: {},
      selection: {
        anchor: { row: 0, col: 0 },
        focus: { row: 0, col: 0 },
        ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
        mode: 'cell',
      },
      editing: null,
    },
    false,
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('scroll preservation during full-span selection', () => {
  beforeEach(() => {
    resetStore();
    scrollToCellSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('clicking a column header does not call scrollToCell', async () => {
    render(<Spreadsheet />);
    scrollToCellSpy.mockClear(); // ignore the initial mount scroll to (0, 0)

    fireEvent.mouseDown(screen.getAllByRole('columnheader')[3]!);
    await act(async () => {});

    expect(scrollToCellSpy).not.toHaveBeenCalled();
  });

  it('clicking a row header does not call scrollToCell', async () => {
    render(<Spreadsheet />);
    scrollToCellSpy.mockClear();

    fireEvent.mouseDown(screen.getAllByRole('rowheader')[5]!);
    await act(async () => {});

    expect(scrollToCellSpy).not.toHaveBeenCalled();
  });

  it('clicking the corner (select-all) does not call scrollToCell', async () => {
    const { container } = render(<Spreadsheet />);
    scrollToCellSpy.mockClear();

    const corner = container.querySelector<HTMLElement>('.cellforge-corner');
    expect(corner).not.toBeNull();
    fireEvent.mouseDown(corner!);
    await act(async () => {});

    expect(scrollToCellSpy).not.toHaveBeenCalled();
  });

  it('navigating to a cell does call scrollToCell with the correct coordinates', async () => {
    render(<Spreadsheet />);
    scrollToCellSpy.mockClear();

    act(() => useSpreadsheetStore.getState().selectCell(10, 4));
    await act(async () => {});

    expect(scrollToCellSpy).toHaveBeenCalledWith(
      expect.objectContaining({ rowIndex: 10, columnIndex: 4 }),
    );
  });
});
