import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpreadsheetStore } from '../store';
import { cellAddress } from './addressing';
import { copySelection, cutSelection, pasteClipboard, CUT_NONCE_MIME } from './clipboard';

const writeText = vi.fn<(text: string) => Promise<void>>();
const readText = vi.fn<() => Promise<string>>();

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText, readText },
  configurable: true,
});

function setState(
  cells: Record<string, { v?: string | number | boolean }>,
  anchor = { row: 0, col: 0 },
  selectionEnd = anchor,
) {
  useSpreadsheetStore.setState(
    {
      cells,
      rowCount: 10,
      columnCount: 10,
      rowHeights: {},
      colWidths: {},
      selection: {
        anchor,
        focus: selectionEnd,
        ranges: [{ start: anchor, end: selectionEnd }],
        mode: 'range',
      },
      editing: null,
    },
    false,
  );
}

function cellValue(ref: string) {
  return useSpreadsheetStore.getState().cells[ref]?.v;
}

beforeEach(() => {
  writeText.mockResolvedValue(undefined);
  readText.mockResolvedValue('');
  useSpreadsheetStore.setState({ pendingClipboard: null }, false);
  setState({});
});

// ─── copySelection ────────────────────────────────────────────────────────────

describe('copySelection', () => {
  it('writes selected range as TSV', async () => {
    setState(
      { [cellAddress(0, 0)]: { v: 'A' }, [cellAddress(0, 1)]: { v: 'B' } },
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    );
    await copySelection();
    expect(writeText).toHaveBeenCalledWith('A\tB');
  });

  it('represents empty cells as empty string in TSV', async () => {
    setState(
      { [cellAddress(0, 0)]: { v: 'X' } },
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    );
    await copySelection();
    expect(writeText).toHaveBeenCalledWith('X\t');
  });

  it('quotes fields containing tabs, newlines, or quotes', async () => {
    setState(
      {
        [cellAddress(0, 0)]: { v: 'left\tright' },
        [cellAddress(0, 1)]: { v: 'line1\nline2' },
        [cellAddress(0, 2)]: { v: 'say "hi"' },
      },
      { row: 0, col: 0 },
      { row: 0, col: 2 },
    );

    await copySelection();
    expect(writeText).toHaveBeenCalledWith('"left\tright"\t"line1\nline2"\t"say ""hi"""');
  });

  it('arms pendingClipboard with mode copy after writeText resolves', async () => {
    setState({}, { row: 0, col: 0 }, { row: 1, col: 1 });
    await copySelection();
    expect(useSpreadsheetStore.getState().pendingClipboard).toEqual({
      mode: 'copy',
      range: { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } },
    });
  });

  it('copy indicator is cleared after a successful paste', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'Q' } }, { row: 0, col: 0 });
    await copySelection();

    readText.mockResolvedValue('Q');
    setState({ [cellAddress(0, 0)]: { v: 'Q' } }, { row: 1, col: 0 });
    await pasteClipboard();

    // Source must be untouched; indicator must be cleared after paste.
    expect(cellValue(cellAddress(0, 0))).toBe('Q');
    expect(cellValue(cellAddress(1, 0))).toBe('Q');
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });
});

// ─── multi-range guard ────────────────────────────────────────────────────────

describe('multi-range selection', () => {
  beforeEach(() => writeText.mockClear());

  function setMultiRangeState() {
    useSpreadsheetStore.setState(
      {
        cells: { [cellAddress(0, 0)]: { v: 'A' }, [cellAddress(2, 0)]: { v: 'C' } },
        rowCount: 10,
        columnCount: 10,
        rowHeights: {},
        colWidths: {},
        selection: {
          anchor: { row: 0, col: 0 },
          focus: { row: 2, col: 0 },
          ranges: [
            { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
            { start: { row: 2, col: 0 }, end: { row: 2, col: 0 } },
          ],
          mode: 'range',
        },
        editing: null,
      },
      false,
    );
  }

  it('copySelection is a no-op when multiple ranges are selected', async () => {
    setMultiRangeState();
    await copySelection();
    expect(writeText).not.toHaveBeenCalled();
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('cutSelection is a no-op when multiple ranges are selected', async () => {
    setMultiRangeState();
    await cutSelection();
    expect(writeText).not.toHaveBeenCalled();
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });
});

// ─── cutSelection ─────────────────────────────────────────────────────────────

describe('cutSelection', () => {
  it('arms pendingClipboard with mode cut only after writeText resolves', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'Z' } });
    await cutSelection();
    // pendingClipboard is armed; actual source clearing requires the nonce path (see ClipboardItem tests).
    expect(useSpreadsheetStore.getState().pendingClipboard).toEqual({
      mode: 'cut',
      range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    });
  });

  it('does not arm pendingClipboard when writeText rejects', async () => {
    writeText.mockRejectedValueOnce(new Error('clipboard denied'));
    setState({ [cellAddress(0, 0)]: { v: 'Z' } });

    await expect(cutSelection()).rejects.toThrow('clipboard denied');

    // Source cell must survive a subsequent paste.
    readText.mockResolvedValue('Z');
    setState({ [cellAddress(0, 0)]: { v: 'Z' } }, { row: 1, col: 0 });
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('Z');
  });
});

// ─── pasteClipboard ───────────────────────────────────────────────────────────

describe('pasteClipboard', () => {
  it('pastes string, number, and boolean values', async () => {
    readText.mockResolvedValue('hello\t42\ttrue');
    setState({}, { row: 0, col: 0 });
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('hello');
    expect(cellValue(cellAddress(0, 1))).toBe(42);
    expect(cellValue(cellAddress(0, 2))).toBe(true);
  });

  it('parses quoted fields with embedded tabs, newlines, and quotes', async () => {
    readText.mockResolvedValue('"left\tright"\t"line1\nline2"\t"say ""hi"""');
    setState({}, { row: 0, col: 0 });
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('left\tright');
    expect(cellValue(cellAddress(0, 1))).toBe('line1\nline2');
    expect(cellValue(cellAddress(0, 2))).toBe('say "hi"');
  });

  it('treats mid-field quotes as literal characters, not RFC quoting', async () => {
    readText.mockResolvedValue('a"b\tc\nfoo"bar\tbaz');
    setState({}, { row: 0, col: 0 });
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('a"b');
    expect(cellValue(cellAddress(0, 1))).toBe('c');
    expect(cellValue(cellAddress(1, 0))).toBe('foo"bar');
    expect(cellValue(cellAddress(1, 1))).toBe('baz');
  });

  it('treats CRLF inside quoted fields as cell content, not a new row', async () => {
    readText.mockResolvedValue('"line1\r\nline2"\tB\r\nC\tD\r\n');
    setState({}, { row: 0, col: 0 });
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('line1\nline2');
    expect(cellValue(cellAddress(0, 1))).toBe('B');
    expect(cellValue(cellAddress(1, 0))).toBe('C');
    expect(cellValue(cellAddress(1, 1))).toBe('D');
    expect(cellValue(cellAddress(2, 0))).toBeUndefined();
  });

  it('clears destination cells for empty entries in the clipboard rectangle', async () => {
    // Destination has ['X', 'Y']; clipboard has ['A', ''] → result must be ['A', undefined].
    setState(
      { [cellAddress(0, 0)]: { v: 'X' }, [cellAddress(0, 1)]: { v: 'Y' } },
      { row: 0, col: 0 },
    );
    readText.mockResolvedValue('A\t');
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('A');
    expect(cellValue(cellAddress(0, 1))).toBeUndefined();
  });

  it('on Firefox/Safari (no ClipboardItem): cut degrades to copy — source is not cleared, cut indicator consumed after paste', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'S' } });
    await cutSelection();
    const clipboardText = (writeText.mock.lastCall as unknown as [string])[0];

    // Paste: value is copied (not moved), source survives, cut indicator is consumed.
    readText.mockResolvedValue(clipboardText);
    setState({ [cellAddress(0, 0)]: { v: 'S' } }, { row: 1, col: 0 });
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('S');   // source untouched
    expect(cellValue(cellAddress(1, 0))).toBe('S');
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('does nothing when clipboard is empty', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'keep' } });
    readText.mockResolvedValue('');
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('keep');
  });

  it('empty paste does not cancel an active copy indicator', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'Q' } }, { row: 0, col: 0 });
    await copySelection();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();

    readText.mockResolvedValue('');
    await pasteClipboard();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();
    expect(useSpreadsheetStore.getState().pendingClipboard?.mode).toBe('copy');
  });

  it('handles CRLF line endings from Excel/Windows clipboard without trailing blank row', async () => {
    // Excel copies ranges with \r\n line endings and appends a trailing \r\n
    readText.mockResolvedValue('A\tB\r\nC\tD\r\n');
    setState({}, { row: 0, col: 0 });
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('A');
    expect(cellValue(cellAddress(0, 1))).toBe('B');
    expect(cellValue(cellAddress(1, 0))).toBe('C');
    expect(cellValue(cellAddress(1, 1))).toBe('D');
    // Trailing \r\n must not produce a third blank row
    expect(cellValue(cellAddress(2, 0))).toBeUndefined();
  });

  it('clips paste content to grid bounds — does not write phantom out-of-bounds cells', async () => {
    // 3-row grid, anchor at row 2 (last row); clipboard has 3 rows × 2 cols
    readText.mockResolvedValue('A\tB\nC\tD\nE\tF');
    setState({}, { row: 2, col: 0 }, { row: 2, col: 0 });
    // Override dimensions AFTER setState (helper resets to 10×10)
    useSpreadsheetStore.setState({ rowCount: 3, columnCount: 2 }, false);
    await pasteClipboard();

    // Row 2 (last valid row) should be written
    expect(cellValue(cellAddress(2, 0))).toBe('A');
    expect(cellValue(cellAddress(2, 1))).toBe('B');
    // Rows 3 and 4 are beyond rowCount=3 — must not exist in the store
    expect(cellValue(cellAddress(3, 0))).toBeUndefined();
    expect(cellValue(cellAddress(4, 0))).toBeUndefined();
  });

  it('setDimensions preserves the cut payload; on Firefox/Safari paste copies without clearing source', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'shrink-me' } });
    await cutSelection();
    const clipboardText = (writeText.mock.lastCall as unknown as [string])[0];

    // Shrink the grid — setDimensions must preserve the cut payload.
    useSpreadsheetStore.getState().setDimensions(5, 5);
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();

    readText.mockResolvedValue(clipboardText);
    setState({ [cellAddress(0, 0)]: { v: 'shrink-me' } }, { row: 1, col: 0 });
    await pasteClipboard();

    // On TSV path (no nonce) cut degrades to copy — source survives.
    expect(cellValue(cellAddress(0, 0))).toBe('shrink-me');
    expect(cellValue(cellAddress(1, 0))).toBe('shrink-me');
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('does not clear cut source when the system clipboard was overwritten by another app before paste', async () => {
    // Cut A1, then another app overwrites the clipboard with different text.
    setState({ [cellAddress(0, 0)]: { v: 'original' } });
    await cutSelection();

    // Simulate an external clipboard write (different app copied "external").
    readText.mockResolvedValue('external');
    setState({ [cellAddress(0, 0)]: { v: 'original' } }, { row: 1, col: 0 });
    await pasteClipboard();

    // "external" is pasted at the destination.
    expect(cellValue(cellAddress(1, 0))).toBe('external');
    // Source must be untouched — the cut was never consumed.
    expect(cellValue(cellAddress(0, 0))).toBe('original');
    // The pending cut indicator is cleared regardless.
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });


});

// ─── store-level clipboard invalidation ───────────────────────────────────────

describe('store-level clipboard invalidation', () => {
  it('clearCells disarms pendingClipboard when the cleared range overlaps a cut source', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'x' } });
    await cutSelection();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();

    // Selection is still A1 (same as the cut source) — overlap exists.
    useSpreadsheetStore.getState().clearCells();
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('clearCells does not disarm pendingClipboard when the cleared range overlaps a copy source', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'x' } });
    await copySelection();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();

    // Delete the source cell — Excel keeps the copy indicator alive.
    useSpreadsheetStore.getState().clearCells();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();
    expect(useSpreadsheetStore.getState().pendingClipboard?.mode).toBe('copy');
  });

  it('clearCells does not disarm pendingClipboard when the cleared range does not overlap the source', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'src' }, [cellAddress(5, 5)]: { v: 'other' } });
    await cutSelection(); // cuts A1

    // Move selection to F6 (far from the cut source) and delete its content.
    useSpreadsheetStore.setState({
      selection: {
        anchor: { row: 5, col: 5 },
        focus: { row: 5, col: 5 },
        ranges: [{ start: { row: 5, col: 5 }, end: { row: 5, col: 5 } }],
        mode: 'cell',
      },
    });
    useSpreadsheetStore.getState().clearCells();

    // The cut indicator on A1 must survive — Excel keeps it alive.
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();
    expect(useSpreadsheetStore.getState().pendingClipboard?.mode).toBe('cut');
  });

  it('clearCells on an empty range is a true no-op and does not disarm pendingClipboard', async () => {
    // Copy an empty range so pendingClipboard is armed but no cells exist.
    setState({}, { row: 0, col: 0 }, { row: 1, col: 1 });
    await copySelection();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();

    // Pressing Delete over an empty selection must not cancel the copy indicator.
    useSpreadsheetStore.getState().clearCells();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();
  });

  it('replaceData disarms pendingClipboard', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'x' } });
    await cutSelection();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();

    useSpreadsheetStore.getState().replaceData([['new']]);
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('setCellValue inside the cut range cancels pendingClipboard (prevents nonce-path data loss)', async () => {
    // Cut A1, then write a new value into A1 — the cut indicator must be disarmed
    // so paste cannot later erase the freshly-written value.
    setState({ [cellAddress(0, 0)]: { v: 'original' } });
    await cutSelection();
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();

    useSpreadsheetStore.getState().setCellValue(0, 0, 'new');
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
    expect(useSpreadsheetStore.getState().cells[cellAddress(0, 0)]?.v).toBe('new');
  });

  it('setCellValue outside the cut range does not cancel pendingClipboard', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'src' } });
    await cutSelection();

    useSpreadsheetStore.getState().setCellValue(1, 1, 'other');
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();
  });

  it('batchSetCells with a cell inside the cut range cancels pendingClipboard', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'src' } });
    await cutSelection();

    useSpreadsheetStore.getState().batchSetCells([{ row: 0, col: 0, value: 'new' }]);
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('setCellValue inside a copy range does not cancel pendingClipboard (only cut is affected)', async () => {
    setState({ [cellAddress(0, 0)]: { v: 'src' } });
    await copySelection();
    expect(useSpreadsheetStore.getState().pendingClipboard?.mode).toBe('copy');

    useSpreadsheetStore.getState().setCellValue(0, 0, 'modified');
    // Copy indicator is unaffected — no source-erase risk exists for copy.
    expect(useSpreadsheetStore.getState().pendingClipboard).not.toBeNull();
  });
});

// ─── ClipboardItem nonce path ─────────────────────────────────────────────────
// These tests exercise pasteClipboard() when navigator.clipboard.read() is
// available (Chrome/Edge) and returns a ClipboardItem with our custom MIME type.
// pendingClipboard is seeded directly in the store to avoid needing the
// ClipboardItem constructor in jsdom.

describe('ClipboardItem nonce path', () => {
  const mockRead = vi.fn<() => Promise<ClipboardItem[]>>();

  function makeClipboardItem(tsvText: string, nonce?: string): ClipboardItem {
    const types = ['text/plain', ...(nonce ? [CUT_NONCE_MIME] : [])];
    return {
      types,
      presentationStyle: 'unspecified',
      getType: async (type: string) => {
        if (type === 'text/plain') return { text: async () => tsvText } as unknown as Blob;
        if (type === CUT_NONCE_MIME && nonce) return { text: async () => nonce } as unknown as Blob;
        throw new DOMException(`type ${type} not found`);
      },
    } as unknown as ClipboardItem;
  }

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: vi.fn().mockResolvedValue(undefined), read: mockRead, writeText, readText },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText, readText },
      configurable: true,
    });
  });

  it('clears cut source when the nonce in ClipboardItem matches', async () => {
    const nonce = 'test-nonce-abc';
    setState({ [cellAddress(0, 0)]: { v: 'hello' } }, { row: 1, col: 0 });
    useSpreadsheetStore.setState({
      pendingClipboard: {
        range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
        mode: 'cut',
        nonce,
      },
    }, false);

    mockRead.mockResolvedValue([makeClipboardItem('hello', nonce)]);
    await pasteClipboard();

    expect(cellValue(cellAddress(0, 0))).toBeUndefined();
    expect(cellValue(cellAddress(1, 0))).toBe('hello');
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('does not clear cut source when another app pastes the same text without the nonce', async () => {
    const nonce = 'test-nonce-xyz';
    setState({ [cellAddress(0, 0)]: { v: 'hello' } }, { row: 1, col: 0 });
    useSpreadsheetStore.setState({
      pendingClipboard: {
        range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
        mode: 'cut',
        nonce,
      },
    }, false);

    // External app wrote 'hello' — no custom MIME nonce present.
    mockRead.mockResolvedValue([makeClipboardItem('hello')]);
    await pasteClipboard();

    expect(cellValue(cellAddress(0, 0))).toBe('hello'); // source untouched
    expect(cellValue(cellAddress(1, 0))).toBe('hello'); // external text pasted
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('cut-paste on the nonce path is atomic — source and destination update in one render', async () => {
    const nonce = 'test-nonce-atomic';
    setState({ [cellAddress(0, 0)]: { v: 'src' } }, { row: 1, col: 0 });
    useSpreadsheetStore.setState({
      pendingClipboard: {
        range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
        mode: 'cut',
        nonce,
      },
    }, false);

    const snapshots: Array<{ src: unknown; dst: unknown }> = [];
    const unsub = useSpreadsheetStore.subscribe((s) => {
      snapshots.push({
        src: s.cells[cellAddress(0, 0)]?.v,
        dst: s.cells[cellAddress(1, 0)]?.v,
      });
    });

    mockRead.mockResolvedValue([makeClipboardItem('src', nonce)]);
    await pasteClipboard();
    unsub();

    // No snapshot should show source blank while destination is still empty.
    const splitFrame = snapshots.find((s) => s.src === undefined && s.dst === undefined);
    expect(splitFrame).toBeUndefined();
    expect(cellValue(cellAddress(0, 0))).toBeUndefined();
    expect(cellValue(cellAddress(1, 0))).toBe('src');
  });

  it('falls back to readText when clipboard.read rejects', async () => {
    mockRead.mockRejectedValue(new DOMException('permission denied'));
    readText.mockResolvedValue('fallback');
    setState({}, { row: 0, col: 0 });
    await pasteClipboard();
    expect(cellValue(cellAddress(0, 0))).toBe('fallback');
  });
});

// ─── row / column mutation shifts or cancels the cut range ────────────────────

describe('row/column mutation shifts or cancels the clipboard range', () => {
  function armCut(row: number, col: number) {
    useSpreadsheetStore.setState({
      pendingClipboard: {
        range: { start: { row, col }, end: { row, col } },
        mode: 'cut',
        nonce: 'n',
      },
    }, false);
  }

  function clipboardRange() {
    return useSpreadsheetStore.getState().pendingClipboard?.range;
  }

  // ── insertRow ──────────────────────────────────────────────────────────────

  it('insertRow before the cut row shifts the range down', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2); // cut row=2
    useSpreadsheetStore.getState().insertRow(0); // insert before
    expect(clipboardRange()).toEqual({ start: { row: 3, col: 2 }, end: { row: 3, col: 2 } });
  });

  it('insertRow at the cut row shifts the range down', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().insertRow(2); // insert at same index
    expect(clipboardRange()).toEqual({ start: { row: 3, col: 2 }, end: { row: 3, col: 2 } });
  });

  it('insertRow after the cut row leaves the range unchanged', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().insertRow(5); // insert after
    expect(clipboardRange()).toEqual({ start: { row: 2, col: 2 }, end: { row: 2, col: 2 } });
  });

  // ── deleteRow ──────────────────────────────────────────────────────────────

  it('deleteRow inside the cut range cancels pendingClipboard', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().deleteRow(2);
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('deleteRow before the cut row shifts the range up', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().deleteRow(0);
    expect(clipboardRange()).toEqual({ start: { row: 1, col: 2 }, end: { row: 1, col: 2 } });
  });

  it('deleteRow after the cut row leaves the range unchanged', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().deleteRow(5);
    expect(clipboardRange()).toEqual({ start: { row: 2, col: 2 }, end: { row: 2, col: 2 } });
  });

  // ── insertColumn ───────────────────────────────────────────────────────────

  it('insertColumn before the cut column shifts the range right', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().insertColumn(0);
    expect(clipboardRange()).toEqual({ start: { row: 2, col: 3 }, end: { row: 2, col: 3 } });
  });

  it('insertColumn after the cut column leaves the range unchanged', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().insertColumn(5);
    expect(clipboardRange()).toEqual({ start: { row: 2, col: 2 }, end: { row: 2, col: 2 } });
  });

  // ── deleteColumn ───────────────────────────────────────────────────────────

  it('deleteColumn inside the cut range cancels pendingClipboard', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().deleteColumn(2);
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });

  it('deleteColumn before the cut column shifts the range left', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().deleteColumn(0);
    expect(clipboardRange()).toEqual({ start: { row: 2, col: 1 }, end: { row: 2, col: 1 } });
  });

  it('deleteColumn after the cut column leaves the range unchanged', () => {
    setState({ [cellAddress(2, 2)]: { v: 'src' } });
    armCut(2, 2);
    useSpreadsheetStore.getState().deleteColumn(5);
    expect(clipboardRange()).toEqual({ start: { row: 2, col: 2 }, end: { row: 2, col: 2 } });
  });
});

// ─── second cut replaces first ────────────────────────────────────────────────

describe('second cut replaces first cut', () => {
  const mockRead = vi.fn<() => Promise<ClipboardItem[]>>();

  function makeClipboardItem(tsvText: string, nonce?: string): ClipboardItem {
    const types = ['text/plain', ...(nonce ? [CUT_NONCE_MIME] : [])];
    return {
      types,
      presentationStyle: 'unspecified',
      getType: async (type: string) => {
        if (type === 'text/plain') return { text: async () => tsvText } as unknown as Blob;
        if (type === CUT_NONCE_MIME && nonce) return { text: async () => nonce } as unknown as Blob;
        throw new DOMException(`type ${type} not found`);
      },
    } as unknown as ClipboardItem;
  }

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: vi.fn().mockResolvedValue(undefined), read: mockRead, writeText, readText },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText, readText },
      configurable: true,
    });
  });

  it('cutting a second range discards the first nonce — only the second source is erased on paste', async () => {
    // ClipboardItem is unavailable in jsdom so we seed pendingClipboard
    // directly to simulate what writeSelection() does on the nonce path.
    useSpreadsheetStore.setState({
      cells: {
        [cellAddress(0, 0)]: { v: 'A1' },
        [cellAddress(1, 1)]: { v: 'B2' },
      },
      rowCount: 10,
      columnCount: 10,
      rowHeights: {},
      colWidths: {},
      editing: null,
      // First cut armed on A1.
      pendingClipboard: {
        range: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
        mode: 'cut',
        nonce: 'first-nonce',
      },
    }, false);

    // Second cut on B2 replaces the first.
    useSpreadsheetStore.getState().setPendingClipboard({
      range: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      mode: 'cut',
      nonce: 'second-nonce',
    });

    expect(useSpreadsheetStore.getState().pendingClipboard?.nonce).toBe('second-nonce');
    expect(useSpreadsheetStore.getState().pendingClipboard?.range).toEqual({
      start: { row: 1, col: 1 }, end: { row: 1, col: 1 },
    });

    // Paste at C3 using the second nonce — only B2 must be erased, not A1.
    useSpreadsheetStore.setState({
      selection: {
        anchor: { row: 2, col: 2 }, focus: { row: 2, col: 2 },
        ranges: [{ start: { row: 2, col: 2 }, end: { row: 2, col: 2 } }],
        mode: 'cell',
      },
    });
    mockRead.mockResolvedValue([makeClipboardItem('B2', 'second-nonce')]);
    await pasteClipboard();

    expect(cellValue(cellAddress(0, 0))).toBe('A1');      // first source untouched
    expect(cellValue(cellAddress(1, 1))).toBeUndefined(); // second source erased
    expect(cellValue(cellAddress(2, 2))).toBe('B2');      // pasted at C3
    expect(useSpreadsheetStore.getState().pendingClipboard).toBeNull();
  });
});
