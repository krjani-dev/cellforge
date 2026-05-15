import { forwardRef, useLayoutEffect, useMemo, useState } from 'react';
import { columnLabel } from '../store';
import { useSpreadsheetStore } from '../store';
import { ColumnResizeHandle, RowResizeHandle } from './ResizeHandles';
import { getColumnWidth, getRowHeight } from './constants';
import { bisectRight, mergeRefs } from './utils';

// Number of headers to render beyond the visible edge on each side.
const OVERSCAN = 2;

export const ColumnHeaderStrip = forwardRef<
  HTMLDivElement,
  {
    stripRef: React.RefObject<HTMLDivElement>;
    scrollOffset: number;
  } & React.HTMLAttributes<HTMLDivElement>
>(function ColumnHeaderStrip({ stripRef, scrollOffset, ...props }, ref) {
  const columnCount = useSpreadsheetStore((s) => s.columnCount);
  const colWidths = useSpreadsheetStore((s) => s.colWidths);
  const selectColumn = useSpreadsheetStore((s) => s.selectColumn);

  const setRef = useMemo(() => mergeRefs(ref, stripRef), [ref, stripRef]);

  const [viewportWidth, setViewportWidth] = useState(0);
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    setViewportWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setViewportWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stripRef]);

  // acc[i] = start pixel offset of column i  (acc[columnCount] = total width)
  const acc = useMemo(() => {
    const out: number[] = new Array(columnCount + 1);
    out[0] = 0;
    for (let i = 0; i < columnCount; i++) out[i + 1] = out[i]! + getColumnWidth(colWidths[i]);
    return out;
  }, [columnCount, colWidths]);

  const totalWidth = acc[columnCount]!;

  const { start, end, leadingWidth } = useMemo(() => {
    // viewportWidth === 0 means layout hasn't been measured yet (JSDOM / SSR).
    // Fall back to rendering everything so tests and non-browser environments work.
    if (viewportWidth === 0) return { start: 0, end: columnCount - 1, leadingWidth: 0 };
    const raw = Math.max(0, bisectRight(acc, scrollOffset) - 1 - OVERSCAN);
    const visEnd = scrollOffset + viewportWidth;
    let e = raw;
    while (e < columnCount - 1 && acc[e + 1]! < visEnd) e++;
    e = Math.min(columnCount - 1, e + OVERSCAN);
    return { start: raw, end: e, leadingWidth: acc[raw]! };
  }, [acc, scrollOffset, viewportWidth, columnCount]);

  const headers = useMemo(() => {
    const out: Array<{ index: number; width: number; label: string }> = [];
    for (let i = start; i <= end; i++) {
      out.push({ index: i, width: getColumnWidth(colWidths[i]), label: columnLabel(i) });
    }
    return out;
  }, [start, end, colWidths]);

  return (
    <div ref={setRef} className="cellforge-col-strip" {...props}>
      <div className="cellforge-col-strip-inner" style={{ width: totalWidth }}>
        {leadingWidth > 0 && <div style={{ width: leadingWidth, flexShrink: 0 }} aria-hidden />}
        {headers.map((h) => (
          <ColumnHeader
            key={h.index}
            index={h.index}
            width={h.width}
            label={h.label}
            onSelect={selectColumn}
          />
        ))}
      </div>
    </div>
  );
});

function ColumnHeader({
  index,
  width,
  label,
  onSelect,
}: {
  index: number;
  width: number;
  label: string;
  onSelect: (col: number) => void;
}) {
  const highlighted = useSpreadsheetStore((state) =>
    state.selection.ranges.some((range) => {
      const r = range.start.col <= range.end.col ? range : { start: range.end, end: range.start };
      return index >= r.start.col && index <= r.end.col;
    }),
  );

  return (
    <div
      className={['cellforge-col-header', highlighted && 'cellforge-col-header-active']
        .filter(Boolean)
        .join(' ')}
      role="columnheader"
      data-col={index}
      style={{ width }}
      onMouseDown={(event) => {
        if (event.button === 0) {
          event.preventDefault();
          onSelect(index);
        }
      }}
    >
      <span className="cellforge-header-label">{label}</span>
      <ColumnResizeHandle index={index} />
    </div>
  );
}

export const RowHeaderStrip = forwardRef<
  HTMLDivElement,
  {
    stripRef: React.RefObject<HTMLDivElement>;
    scrollOffset: number;
  } & React.HTMLAttributes<HTMLDivElement>
>(function RowHeaderStrip({ stripRef, scrollOffset, ...props }, ref) {
  const rowCount = useSpreadsheetStore((s) => s.rowCount);
  const rowHeights = useSpreadsheetStore((s) => s.rowHeights);
  const selectRow = useSpreadsheetStore((s) => s.selectRow);

  const setRef = useMemo(() => mergeRefs(ref, stripRef), [ref, stripRef]);

  const [viewportHeight, setViewportHeight] = useState(0);
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    setViewportHeight(el.clientHeight);
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stripRef]);

  // acc[i] = start pixel offset of row i  (acc[rowCount] = total height)
  const acc = useMemo(() => {
    const out: number[] = new Array(rowCount + 1);
    out[0] = 0;
    for (let i = 0; i < rowCount; i++) out[i + 1] = out[i]! + getRowHeight(rowHeights[i]);
    return out;
  }, [rowCount, rowHeights]);

  const totalHeight = acc[rowCount]!;

  const { start, end, leadingHeight } = useMemo(() => {
    if (viewportHeight === 0) return { start: 0, end: rowCount - 1, leadingHeight: 0 };
    const raw = Math.max(0, bisectRight(acc, scrollOffset) - 1 - OVERSCAN);
    const visEnd = scrollOffset + viewportHeight;
    let e = raw;
    while (e < rowCount - 1 && acc[e + 1]! < visEnd) e++;
    e = Math.min(rowCount - 1, e + OVERSCAN);
    return { start: raw, end: e, leadingHeight: acc[raw]! };
  }, [acc, scrollOffset, viewportHeight, rowCount]);

  const headers = useMemo(() => {
    const out: Array<{ index: number; height: number; label: string }> = [];
    for (let i = start; i <= end; i++) {
      out.push({ index: i, height: getRowHeight(rowHeights[i]), label: String(i + 1) });
    }
    return out;
  }, [start, end, rowHeights]);

  return (
    <div ref={setRef} className="cellforge-row-strip" {...props}>
      <div className="cellforge-row-strip-inner" style={{ height: totalHeight }}>
        {leadingHeight > 0 && <div style={{ height: leadingHeight, flexShrink: 0 }} aria-hidden />}
        {headers.map((h) => (
          <RowHeader
            key={h.index}
            index={h.index}
            height={h.height}
            label={h.label}
            onSelect={selectRow}
          />
        ))}
      </div>
    </div>
  );
});

function RowHeader({
  index,
  height,
  label,
  onSelect,
}: {
  index: number;
  height: number;
  label: string;
  onSelect: (row: number) => void;
}) {
  const highlighted = useSpreadsheetStore((state) =>
    state.selection.ranges.some((range) => {
      const r = range.start.row <= range.end.row ? range : { start: range.end, end: range.start };
      return index >= r.start.row && index <= r.end.row;
    }),
  );

  return (
    <div
      className={['cellforge-row-header', highlighted && 'cellforge-row-header-active']
        .filter(Boolean)
        .join(' ')}
      role="rowheader"
      data-row={index}
      style={{ height }}
      onMouseDown={(event) => {
        if (event.button === 0) {
          event.preventDefault();
          onSelect(index);
        }
      }}
    >
      <span className="cellforge-header-label">{label}</span>
      <RowResizeHandle index={index} />
    </div>
  );
}
