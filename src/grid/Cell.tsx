import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useSpreadsheetStore } from '../store';
import { cellAddress, rangeContains } from '../store';

type CellExtras = Record<string, never>;

export function Cell({
  rowIndex,
  columnIndex,
  style,
  ariaAttributes,
}: {
  rowIndex: number;
  columnIndex: number;
  style: CSSProperties;
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
} & CellExtras) {
  const value = useSpreadsheetStore((state) => state.cells[cellAddress(rowIndex, columnIndex)]?.v);

  const isAnchor = useSpreadsheetStore(
    (state) =>
      state.selection.anchor.row === rowIndex && state.selection.anchor.col === columnIndex,
  );
  const isSelected = useSpreadsheetStore((state) =>
    state.selection.ranges.some((range) => rangeContains(range, rowIndex, columnIndex)),
  );
  const isEditing = useSpreadsheetStore(
    (state) =>
      state.editing !== null && state.editing.row === rowIndex && state.editing.col === columnIndex,
  );

  const className = [
    'cellforge-cell',
    isSelected && !isAnchor && 'cellforge-cell-selected',
    isAnchor && 'cellforge-cell-anchor',
    isEditing && 'cellforge-cell-editing',
  ]
    .filter(Boolean)
    .join(' ');

  if (isEditing) {
    return <CellEditor style={style} ariaAttributes={ariaAttributes} className={className} />;
  }

  return (
    <div
      {...ariaAttributes}
      aria-rowindex={rowIndex + 1}
      aria-selected={isSelected ? true : undefined}
      data-row={rowIndex}
      data-col={columnIndex}
      className={className}
      style={style}
    >
      {value === undefined || value === null ? '' : String(value)}
    </div>
  );
}

export function CellEditor({
  style,
  ariaAttributes,
  className,
}: {
  style: CSSProperties;
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
  className: string;
}) {
  const value = useSpreadsheetStore((s) => s.editing?.value ?? '');
  const updateEditingValue = useSpreadsheetStore((s) => s.updateEditingValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }, []);

  return (
    <div {...ariaAttributes} className={className} style={style}>
      <input
        ref={inputRef}
        type="text"
        className="cellforge-editor-input"
        value={value}
        onChange={(event) => updateEditingValue(event.target.value)}
      />
    </div>
  );
}
