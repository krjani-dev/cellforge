import type { CellValue } from './types';
import { cellAddress, normalizeRange } from './addressing';
import { coerceValue } from './coerce';
import { useSpreadsheetStore } from '../store';

function encodeTsvField(value: CellValue | undefined): string {
  if (value == null) return '';
  // Normalise bare \r → \n so the round-trip is lossless: parseTsv collapses
  // \r\n and bare \r to \n, so encode the same way to avoid mutation on paste.
  const text = String(value).replace(/\r\n?/g, '\n');
  if (!/[\t\n"]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function rangeToTsv(range: Parameters<typeof normalizeRange>[0]): string {
  const { cells } = useSpreadsheetStore.getState();
  const n = normalizeRange(range);
  const rows: string[] = [];
  for (let r = n.start.row; r <= n.end.row; r++) {
    const cols: string[] = [];
    for (let c = n.start.col; c <= n.end.col; c++) {
      const val = cells[cellAddress(r, c)]?.v;
      cols.push(encodeTsvField(val));
    }
    rows.push(cols.join('\t'));
  }
  return rows.join('\n');
}

function parseTsv(tsv: string): CellValue[][] {
  if (!tsv) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let sawAnyContent = false;
  let endedWithRowDelimiter = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < tsv.length; i++) {
    const ch = tsv[i]!;
    sawAnyContent = true;

    if (inQuotes) {
      if (ch === '"') {
        if (tsv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
        endedWithRowDelimiter = false;
        continue;
      }
      if (ch === '\r') {
        if (tsv[i + 1] === '\n') i++;
        field += '\n';
        endedWithRowDelimiter = false;
        continue;
      }
      field += ch;
      endedWithRowDelimiter = false;
      continue;
    }

    if (ch === '"' && field === '') {
      inQuotes = true;
      endedWithRowDelimiter = false;
      continue;
    }
    if (ch === '\t') {
      pushField();
      endedWithRowDelimiter = false;
      continue;
    }
    if (ch === '\n') {
      pushRow();
      endedWithRowDelimiter = true;
      continue;
    }
    if (ch === '\r') {
      if (tsv[i + 1] === '\n') i++;
      pushRow();
      endedWithRowDelimiter = true;
      continue;
    }
    field += ch;
    endedWithRowDelimiter = false;
  }

  if (!sawAnyContent) return [];
  if (!endedWithRowDelimiter) pushRow();

  return rows.map((parsedRow) => parsedRow.map(coerceValue));
}

// Out-of-band MIME type carried by ClipboardItem so the nonce never appears in
// the text/plain payload that other apps consume.  "web " prefix is required by
// the Async Clipboard API for custom types.
export const CUT_NONCE_MIME = 'web application/x-cellforge-nonce';

async function writeSelection(mode: 'copy' | 'cut'): Promise<void> {
  const state = useSpreadsheetStore.getState();
  if (state.selection.ranges.length > 1) return;
  const range = state.selection.ranges.at(-1);
  if (!range) return;
  const tsv = rangeToTsv(range);

  let nonce: string | undefined;
  if (mode === 'cut') {
    nonce = crypto.randomUUID();
    try {
      // Write plain TSV plus an out-of-band nonce so the clipboard text is
      // identical to a normal copy for every external app.
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
          [CUT_NONCE_MIME]: new Blob([nonce], { type: CUT_NONCE_MIME }),
        }),
      ]);
    } catch {
      // ClipboardItem / custom MIME types not supported (e.g. Firefox); fall
      // back to plain writeText.  Provenance checking degrades to TSV equality.
      await navigator.clipboard.writeText(tsv);
      nonce = undefined;
    }
  } else {
    await navigator.clipboard.writeText(tsv);
  }

  useSpreadsheetStore.getState().setPendingClipboard({
    range: normalizeRange(range),
    mode,
    ...(mode === 'cut' && nonce !== undefined ? { nonce } : {}),
  });
}

export const copySelection = () => writeSelection('copy');
export const cutSelection = () => writeSelection('cut');

export async function pasteClipboard(): Promise<void> {
  let text: string;
  let clipboardNonce: string | undefined;

  try {
    const [item] = await navigator.clipboard.read();
    if (!item) throw new DOMException('empty read');
    text = await (await item.getType('text/plain')).text();
    if (item.types.includes(CUT_NONCE_MIME)) {
      clipboardNonce = await (await item.getType(CUT_NONCE_MIME)).text();
    }
  } catch {
    // clipboard.read() unavailable or permission denied; fall back to readText.
    text = await navigator.clipboard.readText();
  }

  const values = parseTsv(text);

  // Re-read fresh state after the async gap — anchor/bounds may have changed.
  const fresh = useSpreadsheetStore.getState();

  if (values.length === 0) return;

  const { anchor } = fresh.selection;

  const updates: Array<{ row: number; col: number; value: CellValue }> = [];
  values.forEach((row, ri) => {
    if (anchor.row + ri >= fresh.rowCount) return;
    row.forEach((val, ci) => {
      if (anchor.col + ci >= fresh.columnCount) return;
      updates.push({ row: anchor.row + ri, col: anchor.col + ci, value: val });
    });
  });

  const pending = fresh.pendingClipboard;
  // Snapshot the pending reference before any async work so we can guard the
  // final clear against a second Ctrl+X that may fire during the clipboard I/O.
  const pendingAtStart = pending;
  if (pending?.mode === 'cut') {
    const isSameCut =
      pending.nonce !== undefined && clipboardNonce !== undefined
        ? clipboardNonce === pending.nonce   // strong: nonce path (Chrome/Edge)
        : false;                            // TSV equality is not reliable provenance; cut degrades to copy on Firefox/Safari
    if (isSameCut) {
      // Erase source and write destination in one set() call to avoid a
      // mid-frame state where source is blank but destination not yet written.
      fresh.moveCells(pending.range, updates);
      // Replace the entire clipboard (not just text/plain) so the custom nonce
      // MIME entry is fully evicted; fall back to writeText for browsers that
      // don't support ClipboardItem.
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/plain': new Blob([''], { type: 'text/plain' }) }),
        ]);
      } catch {
        await navigator.clipboard.writeText('').catch(() => {});
      }
    } else {
      fresh.batchSetCells(updates);
    }
  } else {
    fresh.batchSetCells(updates);
  }
  // Only clear the indicator if it hasn't been replaced by a new cut/copy that
  // started while the clipboard read() was resolving (async gap).
  if (useSpreadsheetStore.getState().pendingClipboard === pendingAtStart) {
    fresh.setPendingClipboard(null);
  }
}
