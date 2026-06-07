import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties, FocusEvent } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSpreadsheetStore } from '../store';
import { cellAddress, rangeContains } from '../store';

type CellExtras = {
  onEditorBlur: (event: FocusEvent<HTMLInputElement>) => void;
};

export function Cell({
  rowIndex,
  columnIndex,
  style,
  ariaAttributes,
  onEditorBlur,
}: {
  rowIndex: number;
  columnIndex: number;
  style: CSSProperties;
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
} & CellExtras) {
  const { value, isAnchor, isSelected, isEditing, isCut, isCopy } = useSpreadsheetStore(
    useShallow((s) => ({
      value: s.cells[cellAddress(rowIndex, columnIndex)]?.v,
      isAnchor: s.selection.anchor.row === rowIndex && s.selection.anchor.col === columnIndex,
      isSelected: s.selection.ranges.some((r) => rangeContains(r, rowIndex, columnIndex)),
      isEditing: s.editing?.row === rowIndex && s.editing?.col === columnIndex,
      isCut:
        s.pendingClipboard?.mode === 'cut' &&
        rangeContains(s.pendingClipboard.range, rowIndex, columnIndex),
      isCopy:
        s.pendingClipboard?.mode === 'copy' &&
        rangeContains(s.pendingClipboard.range, rowIndex, columnIndex),
    })),
  );

  const className = [
    'cellforge-cell',
    isCut && 'cellforge-cell-cut',
    isCopy && 'cellforge-cell-copy',
    isSelected && !isAnchor && 'cellforge-cell-selected',
    isAnchor && 'cellforge-cell-anchor',
    isEditing && 'cellforge-cell-editing',
  ]
    .filter(Boolean)
    .join(' ');

  if (isEditing) {
    return (
      <CellEditor
        style={style}
        ariaAttributes={ariaAttributes}
        className={className}
        onBlur={onEditorBlur}
      />
    );
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
  onBlur,
}: {
  style: CSSProperties;
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
  className: string;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
}) {
  const value = useSpreadsheetStore((s) => s.editing?.value ?? '');
  const row = useSpreadsheetStore((s) => s.editing?.row ?? 0);
  const updateEditingValue = useSpreadsheetStore((s) => s.updateEditingValue);
  const commitEditing = useSpreadsheetStore((s) => s.commitEditing);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }, []);

  return (
    <div {...ariaAttributes} aria-rowindex={row + 1} className={className} style={style}>
      <input
        ref={inputRef}
        type="text"
        className="cellforge-editor-input"
        value={value}
        onChange={(event) => updateEditingValue(event.target.value)}
        onBlur={(event) => {
          commitEditing();
          onBlur(event);
        }}
      />
    </div>
  );
}
