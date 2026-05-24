import { act, fireEvent, render, screen, within, cleanup, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Spreadsheet } from './index';
import type { SpreadsheetHandle } from './index';
import { useSpreadsheetStore } from './store';

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

beforeEach(resetStore);
afterEach(() => {
  cleanup();
});

// ──────────────────────────────────────────────────────────────────────────────
// Mount + structure
// ──────────────────────────────────────────────────────────────────────────────

describe('Spreadsheet (scaffold integration)', () => {
  it('renders a grid root with the accessibility role', () => {
    render(<Spreadsheet />);
    expect(screen.getByRole('grid', { name: 'Spreadsheet' })).toBeInTheDocument();
    expect(screen.getByTestId('cellforge-spreadsheet')).toBeInTheDocument();
  });

  it('renders column headers A through the default 26', () => {
    render(<Spreadsheet />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(26);
    expect(within(headers[0]!).getByText('A')).toBeInTheDocument();
    expect(within(headers[25]!).getByText('Z')).toBeInTheDocument();
  });

  it('renders row headers 1..N for the default 100', () => {
    render(<Spreadsheet />);
    const headers = screen.getAllByRole('rowheader');
    expect(headers).toHaveLength(100);
    expect(within(headers[0]!).getByText('1')).toBeInTheDocument();
    expect(within(headers[99]!).getByText('100')).toBeInTheDocument();
  });

  it('honors the rows / columns props as exact dimensions', () => {
    render(<Spreadsheet rows={5} columns={3} />);
    expect(screen.getAllByRole('rowheader')).toHaveLength(5);
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
  });

  it('grows dimensions when rows / columns exceed defaults', () => {
    render(<Spreadsheet rows={150} columns={30} />);
    expect(screen.getAllByRole('rowheader')).toHaveLength(150);
    expect(screen.getAllByRole('columnheader')).toHaveLength(30);
  });

  it('loads initialData into the store', () => {
    render(
      <Spreadsheet
        initialData={[
          ['Region', 'Q1'],
          ['North', 1200],
        ]}
      />,
    );
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'Region' });
    expect(useSpreadsheetStore.getState().cells['B1']).toEqual({ v: 'Q1' });
    expect(useSpreadsheetStore.getState().cells['A2']).toEqual({ v: 'North' });
    expect(useSpreadsheetStore.getState().cells['B2']).toEqual({ v: 1200 });
  });

  it('initialData does not expand the grid beyond the rows/columns cap', () => {
    // rows={2} columns={2} but initialData has 4 rows and 4 columns
    render(
      <Spreadsheet
        rows={2}
        columns={2}
        initialData={[
          ['A', 'B', 'C', 'D'],
          ['E', 'F', 'G', 'H'],
          ['I', 'J', 'K', 'L'],
          ['M', 'N', 'O', 'P'],
        ]}
      />,
    );
    const state = useSpreadsheetStore.getState();
    expect(state.rowCount).toBe(2);
    expect(state.columnCount).toBe(2);
    // Only the 2×2 intersection should be loaded
    expect(state.cells['A1']).toEqual({ v: 'A' });
    expect(state.cells['B2']).toEqual({ v: 'F' });
    expect(state.cells['C1']).toBeUndefined();
    expect(state.cells['A3']).toBeUndefined();
  });

  it('forwards a custom className to the outer shell', () => {
    const { container } = render(<Spreadsheet className="my-shell" />);
    expect(container.querySelector('.cellforge-shell.my-shell')).not.toBeNull();
  });

  it('resets the store on each mount so state from a previous mount does not bleed in', () => {
    // Mount with data, simulate a previous "story" living in the store.
    const first = render(
      <Spreadsheet
        initialData={[
          ['kept', 'across'],
          ['mount', 'boundary?'],
        ]}
      />,
    );
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'kept' });
    // Pretend the user also customized sizes + edited a cell.
    act(() => useSpreadsheetStore.getState().setColWidth(2, 240));
    act(() => useSpreadsheetStore.getState().selectCell(3, 3));
    first.unmount();

    // Remount the empty default — store should be back to defaults.
    render(<Spreadsheet />);
    expect(useSpreadsheetStore.getState().cells).toEqual({});
    expect(useSpreadsheetStore.getState().colWidths).toEqual({});
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 0 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getData() ref API
// ──────────────────────────────────────────────────────────────────────────────

describe('SpreadsheetHandle.getData()', () => {
  it('returns a dense 2D array matching initialData', () => {
    const ref = createRef<SpreadsheetHandle>();
    render(
      <Spreadsheet
        ref={ref}
        rows={3}
        columns={3}
        initialData={[
          [1, 2, 3],
          [4, 5, 6],
        ]}
      />,
    );
    const data = ref.current!.getData();
    expect(data).toHaveLength(3);
    expect(data[0]).toEqual([1, 2, 3]);
    expect(data[1]).toEqual([4, 5, 6]);
    expect(data[2]).toEqual([null, null, null]);
  });

  it('reflects cell edits applied after mount', () => {
    const ref = createRef<SpreadsheetHandle>();
    render(<Spreadsheet ref={ref} rows={2} columns={2} />);
    act(() => useSpreadsheetStore.getState().setCellValue(0, 0, 'hello'));
    expect(ref.current!.getData()[0]![0]).toBe('hello');
  });

  it('includes an in-progress edit after the editor input loses focus', () => {
    const ref = createRef<SpreadsheetHandle>();
    render(<Spreadsheet ref={ref} rows={2} columns={2} />);
    act(() => useSpreadsheetStore.getState().startEditing(0, 0, 'typed'));
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input')!;
    fireEvent.blur(input);
    expect(ref.current!.getData()[0]![0]).toBe('typed');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// onDataChange callback
// ──────────────────────────────────────────────────────────────────────────────

describe('onDataChange', () => {
  it('is called when a cell value changes', () => {
    const onChange = vi.fn();
    render(<Spreadsheet rows={2} columns={2} onDataChange={onChange} />);
    act(() => useSpreadsheetStore.getState().setCellValue(0, 0, 42));
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1]![0] as unknown[][];
    expect(last[0]![0]).toBe(42);
  });

  it('is not called when only selection changes', () => {
    const onChange = vi.fn();
    render(<Spreadsheet rows={2} columns={2} onDataChange={onChange} />);
    act(() => useSpreadsheetStore.getState().selectCell(1, 1));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Mouse selection
// ──────────────────────────────────────────────────────────────────────────────

function firstCell(row: number, col: number) {
  return document.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
}

describe('mouse selection', () => {
  it('clicking a column header selects the column', () => {
    render(<Spreadsheet />);
    const headers = screen.getAllByRole('columnheader');
    fireEvent.mouseDown(headers[3]!);
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.mode).toBe('column');
    expect(sel.anchor).toEqual({ row: 0, col: 3 });
    expect(sel.ranges[0]).toEqual({ start: { row: 0, col: 3 }, end: { row: 99, col: 3 } });
  });

  it('clicking a row header selects the row', () => {
    render(<Spreadsheet />);
    const headers = screen.getAllByRole('rowheader');
    fireEvent.mouseDown(headers[5]!);
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.mode).toBe('row');
    expect(sel.anchor).toEqual({ row: 5, col: 0 });
  });

  it('clicking the corner selects all cells', () => {
    const { container } = render(<Spreadsheet />);
    const corner = container.querySelector<HTMLElement>('.cellforge-corner');
    expect(corner).not.toBeNull();
    fireEvent.mouseDown(corner!);
    expect(useSpreadsheetStore.getState().selection.mode).toBe('all');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Keyboard navigation + editing
// ──────────────────────────────────────────────────────────────────────────────

function getGridRoot() {
  return screen.getByTestId('cellforge-spreadsheet');
}

describe('keyboard navigation', () => {
  it('arrow keys move the anchor', () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    fireEvent.keyDown(root, { key: 'ArrowDown' });
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 2, col: 1 });
  });

  it('shift+arrow extends the range', () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    fireEvent.keyDown(root, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(root, { key: 'ArrowRight', shiftKey: true });
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.anchor).toEqual({ row: 0, col: 0 });
    expect(sel.ranges[0]).toEqual({ start: { row: 0, col: 0 }, end: { row: 0, col: 2 } });
  });

  it('ctrl+Home jumps to A1', () => {
    render(<Spreadsheet />);
    act(() => useSpreadsheetStore.getState().selectCell(50, 10));
    fireEvent.keyDown(getGridRoot(), { key: 'Home', ctrlKey: true });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 0 });
  });

  it('ctrl+End jumps to bottom-right', () => {
    render(<Spreadsheet />);
    fireEvent.keyDown(getGridRoot(), { key: 'End', ctrlKey: true });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 99, col: 25 });
  });

  it('ctrl+a selects all', () => {
    render(<Spreadsheet />);
    fireEvent.keyDown(getGridRoot(), { key: 'a', ctrlKey: true });
    expect(useSpreadsheetStore.getState().selection.mode).toBe('all');
  });

  it('tab moves right, shift+tab moves left', () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    fireEvent.keyDown(root, { key: 'Tab' });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 1 });
    fireEvent.keyDown(root, { key: 'Tab', shiftKey: true });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 0 });
  });

  it('Backspace clears values inside the active selection', () => {
    render(
      <Spreadsheet
        initialData={[
          ['x', 'y'],
          ['z', 'w'],
        ]}
      />,
    );
    act(() =>
      useSpreadsheetStore.getState().selectRange({
        start: { row: 0, col: 0 },
        end: { row: 1, col: 1 },
      }),
    );
    fireEvent.keyDown(getGridRoot(), { key: 'Backspace' });
    expect(useSpreadsheetStore.getState().cells['A1']).toBeUndefined();
    expect(useSpreadsheetStore.getState().cells['B2']).toBeUndefined();
  });
});

describe('cell editor', () => {
  it('F2 opens the editor with the existing value', () => {
    render(<Spreadsheet initialData={[['hello']]} />);
    fireEvent.keyDown(getGridRoot(), { key: 'F2' });
    expect(useSpreadsheetStore.getState().editing).toEqual({ row: 0, col: 0, value: 'hello' });
  });

  it('a printable key opens the editor with that key as the value', () => {
    render(<Spreadsheet />);
    fireEvent.keyDown(getGridRoot(), { key: 'x' });
    expect(useSpreadsheetStore.getState().editing).toEqual({ row: 0, col: 0, value: 'x' });
  });

  it('Enter commits and moves down', () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    fireEvent.keyDown(root, { key: 'h' });
    // Typing more into the input fires onChange on the rendered input.
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { value: 'hi' } });
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'hi' });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 1, col: 0 });
    expect(useSpreadsheetStore.getState().editing).toBeNull();
  });

  it('Esc cancels without writing', () => {
    render(<Spreadsheet initialData={[['old']]} />);
    fireEvent.keyDown(getGridRoot(), { key: 'F2' });
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input');
    fireEvent.change(input!, { target: { value: 'discard' } });
    fireEvent.keyDown(getGridRoot(), { key: 'Escape' });
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'old' });
    expect(useSpreadsheetStore.getState().editing).toBeNull();
  });

  it('double-click on a cell opens the editor', () => {
    render(<Spreadsheet />);
    const cell = firstCell(0, 1);
    expect(cell).not.toBeNull();
    fireEvent.doubleClick(cell!);
    expect(useSpreadsheetStore.getState().editing?.row).toBe(0);
    expect(useSpreadsheetStore.getState().editing?.col).toBe(1);
  });

  it('Tab inside the editor commits and moves right', () => {
    render(<Spreadsheet />);
    fireEvent.keyDown(getGridRoot(), { key: '5' });
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input');
    fireEvent.change(input!, { target: { value: '5' } });
    fireEvent.keyDown(getGridRoot(), { key: 'Tab' });
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 5 });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 1 });
  });

  it('arrow keys inside the editor commit and continue navigation', () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    act(() => useSpreadsheetStore.getState().selectCell(9, 4));
    root.focus();
    fireEvent.keyDown(root, { key: '1' });
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { value: '1)' } });
    fireEvent.keyDown(input!, { key: 'ArrowDown' });
    expect(useSpreadsheetStore.getState().cells['E10']).toEqual({ v: '1)' });
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 10, col: 4 });
    expect(useSpreadsheetStore.getState().editing).toBeNull();
    expect(root).toHaveFocus();
  });

  it('blur after editing commits and restores focus to the grid root', async () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    root.focus();
    fireEvent.keyDown(root, { key: 'x' });
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { value: 'blurred' } });
    fireEvent.blur(input!);
    await waitFor(() => expect(root).toHaveFocus());
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'blurred' });
  });

  it('Tab returns focus to the grid root after closing the editor', () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    root.focus();
    fireEvent.keyDown(root, { key: 'x' });
    fireEvent.keyDown(root, { key: 'Tab' });
    expect(root).toHaveFocus();
  });

  it('Enter returns focus to the grid root after closing the editor', () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    root.focus();
    fireEvent.keyDown(root, { key: 'x' });
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(root).toHaveFocus();
  });

  it('Escape returns focus to the grid root after cancelling the editor', () => {
    render(<Spreadsheet />);
    const root = getGridRoot();
    root.focus();
    fireEvent.keyDown(root, { key: 'F2' });
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(root).toHaveFocus();
  });

  it('clicking another cell while editing commits the current editor', () => {
    render(<Spreadsheet />);
    // Open editor on A1 and type a value.
    fireEvent.keyDown(getGridRoot(), { key: 'h' });
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input');
    fireEvent.change(input!, { target: { value: 'hello' } });
    // Click B1 (row 0, col 1).
    const b1 = firstCell(0, 1);
    expect(b1).not.toBeNull();
    fireEvent.mouseDown(b1!);
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'hello' });
    expect(useSpreadsheetStore.getState().editing).toBeNull();
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 0, col: 1 });
  });

  it('clicking a column header while editing commits the current editor', () => {
    render(<Spreadsheet />);
    fireEvent.keyDown(getGridRoot(), { key: 'x' });
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input');
    fireEvent.change(input!, { target: { value: 'col-test' } });
    const colHeader = screen.getAllByRole('columnheader')[2]!;
    fireEvent.mouseDown(colHeader);
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'col-test' });
    expect(useSpreadsheetStore.getState().editing).toBeNull();
  });

  it('clicking a row header while editing commits the current editor', () => {
    render(<Spreadsheet />);
    fireEvent.keyDown(getGridRoot(), { key: 'y' });
    const input = document.querySelector<HTMLInputElement>('.cellforge-editor-input');
    fireEvent.change(input!, { target: { value: 'row-test' } });
    const rowHeader = screen.getAllByRole('rowheader')[3]!;
    fireEvent.mouseDown(rowHeader);
    expect(useSpreadsheetStore.getState().cells['A1']).toEqual({ v: 'row-test' });
    expect(useSpreadsheetStore.getState().editing).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Right-click pre-selection (context menu open is Radix's concern; we verify
// the wiring that selects the target before the menu opens, which is what
// makes the menu act on the right thing).
// ──────────────────────────────────────────────────────────────────────────────

describe('right-click pre-selection', () => {
  it('right-clicking outside the current selection moves the anchor', () => {
    render(<Spreadsheet />);
    act(() => useSpreadsheetStore.getState().selectCell(0, 0));
    const target = firstCell(2, 3);
    expect(target).not.toBeNull();
    fireEvent.contextMenu(target!);
    expect(useSpreadsheetStore.getState().selection.anchor).toEqual({ row: 2, col: 3 });
  });

  it('right-clicking inside the current selection preserves it', () => {
    render(<Spreadsheet />);
    act(() =>
      useSpreadsheetStore.getState().selectRange({
        start: { row: 0, col: 0 },
        end: { row: 3, col: 3 },
      }),
    );
    const target = firstCell(1, 1);
    fireEvent.contextMenu(target!);
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.ranges[0]).toEqual({ start: { row: 0, col: 0 }, end: { row: 3, col: 3 } });
  });

  it('right-clicking a row header selects the row', () => {
    render(<Spreadsheet />);
    const headers = screen.getAllByRole('rowheader');
    fireEvent.contextMenu(headers[4]!);
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.mode).toBe('row');
    expect(sel.anchor.row).toBe(4);
  });

  it('right-clicking a column header selects the column', () => {
    render(<Spreadsheet />);
    const headers = screen.getAllByRole('columnheader');
    fireEvent.contextMenu(headers[2]!);
    const sel = useSpreadsheetStore.getState().selection;
    expect(sel.mode).toBe('column');
    expect(sel.anchor.col).toBe(2);
  });

  it('right-clicking the corner selects all', () => {
    const { container } = render(<Spreadsheet />);
    const corner = container.querySelector<HTMLElement>('.cellforge-corner');
    fireEvent.contextMenu(corner!);
    expect(useSpreadsheetStore.getState().selection.mode).toBe('all');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Resize handles
// ──────────────────────────────────────────────────────────────────────────────

describe('column resize', () => {
  it('renders a resize handle on every column header', () => {
    render(<Spreadsheet />);
    const handles = document.querySelectorAll('[data-resize-col]');
    expect(handles.length).toBe(26);
  });

  it('double-click on a column resize handle resets to default width', () => {
    useSpreadsheetStore.getState().setColWidth(3, 200);
    render(<Spreadsheet />);
    const handle = document.querySelector<HTMLDivElement>('[data-resize-col="3"]');
    expect(handle).not.toBeNull();
    fireEvent.doubleClick(handle!);
    expect(useSpreadsheetStore.getState().colWidths[3]).toBe(96);
  });

  it('handle mousedown does not bubble to the header onMouseDown', () => {
    render(<Spreadsheet />);
    const handle = document.querySelector<HTMLDivElement>('[data-resize-col="3"]');
    fireEvent.mouseDown(handle!);
    // Header would have set selection.mode = 'column' if click bubbled; it didn't.
    expect(useSpreadsheetStore.getState().selection.mode).toBe('cell');
  });
});

describe('row resize', () => {
  it('renders a resize handle on every row header', () => {
    render(<Spreadsheet />);
    const handles = document.querySelectorAll('[data-resize-row]');
    expect(handles.length).toBe(100);
  });

  it('double-click on a row resize handle resets to default height', () => {
    useSpreadsheetStore.getState().setRowHeight(5, 80);
    render(<Spreadsheet />);
    const handle = document.querySelector<HTMLDivElement>('[data-resize-row="5"]');
    expect(handle).not.toBeNull();
    fireEvent.doubleClick(handle!);
    expect(useSpreadsheetStore.getState().rowHeights[5]).toBe(24);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Context menu items
// Each test opens a menu by firing a contextmenu event on the appropriate
// trigger and verifies the expected menu items are present in the document.
// ──────────────────────────────────────────────────────────────────────────────

describe('context menu items', () => {
  it('cell context menu contains all expected actions', async () => {
    render(<Spreadsheet />);
    const cell = firstCell(0, 0);
    expect(cell).not.toBeNull();
    await act(async () => {
      fireEvent.contextMenu(cell!);
    });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Clear values' })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: 'Insert row above' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Insert row below' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete row' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Insert column left' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Insert column right' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete column' })).toBeInTheDocument();
  });

  it('row header context menu contains all expected actions', async () => {
    render(<Spreadsheet />);
    const header = screen.getAllByRole('rowheader')[2]!;
    await act(async () => {
      fireEvent.contextMenu(header);
    });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Insert row above' })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: 'Insert row below' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete row' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Clear values' })).toBeInTheDocument();
  });

  it('column header context menu contains all expected actions', async () => {
    render(<Spreadsheet />);
    const header = screen.getAllByRole('columnheader')[1]!;
    await act(async () => {
      fireEvent.contextMenu(header);
    });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Insert column left' })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: 'Insert column right' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete column' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Clear values' })).toBeInTheDocument();
  });

  it('menu closes after selecting an action', async () => {
    render(<Spreadsheet initialData={[['val']]} />);
    const cell = firstCell(0, 0);
    await act(async () => {
      fireEvent.contextMenu(cell!);
    });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Clear values' })).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Clear values' }));
    });
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: 'Clear values' })).not.toBeInTheDocument();
    });
  });

  it('corner context menu contains all expected actions', async () => {
    const { container } = render(<Spreadsheet />);
    const corner = container.querySelector<HTMLElement>('.cellforge-corner');
    expect(corner).not.toBeNull();
    await act(async () => {
      fireEvent.contextMenu(corner!);
    });
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Select all' })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: 'Clear all values' })).toBeInTheDocument();
  });
});
