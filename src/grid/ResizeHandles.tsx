import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { columnLabel } from '../store';
import { useSpreadsheetStore } from '../store';
import {
  DEFAULT_ROW_HEIGHT,
  DEFAULT_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  MIN_COLUMN_WIDTH,
} from './constants';

export function ColumnResizeHandle({ index }: { index: number }) {
  const setColWidth = useSpreadsheetStore((s) => s.setColWidth);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      dragCleanupRef.current?.();
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      dragCleanupRef.current?.();
      const target = event.currentTarget;
      const startX = event.clientX;
      const startWidth = useSpreadsheetStore.getState().colWidths[index] ?? DEFAULT_COLUMN_WIDTH;
      target.setPointerCapture(event.pointerId);

      let pending = startWidth;
      let rafId: number | null = null;

      const move = (e: PointerEvent) => {
        pending = Math.max(MIN_COLUMN_WIDTH, startWidth + (e.clientX - startX));
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          setColWidth(index, pending);
          rafId = null;
        });
      };
      const up = (e: PointerEvent) => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setColWidth(index, Math.max(MIN_COLUMN_WIDTH, startWidth + (e.clientX - startX)));
        target.releasePointerCapture(e.pointerId);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
        dragCleanupRef.current = null;
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
      dragCleanupRef.current = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
      };
    },
    [index, setColWidth],
  );

  const handleDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setColWidth(index, DEFAULT_COLUMN_WIDTH);
    },
    [index, setColWidth],
  );

  return (
    <div
      className="cellforge-resize-handle cellforge-col-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize column ${columnLabel(index)}`}
      data-resize-col={index}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(event) => event.stopPropagation()}
    />
  );
}

export function RowResizeHandle({ index }: { index: number }) {
  const setRowHeight = useSpreadsheetStore((s) => s.setRowHeight);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      dragCleanupRef.current?.();
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      dragCleanupRef.current?.();
      const target = event.currentTarget;
      const startY = event.clientY;
      const startHeight = useSpreadsheetStore.getState().rowHeights[index] ?? DEFAULT_ROW_HEIGHT;
      target.setPointerCapture(event.pointerId);

      let pending = startHeight;
      let rafId: number | null = null;

      const move = (e: PointerEvent) => {
        pending = Math.max(MIN_ROW_HEIGHT, startHeight + (e.clientY - startY));
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          setRowHeight(index, pending);
          rafId = null;
        });
      };
      const up = (e: PointerEvent) => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setRowHeight(index, Math.max(MIN_ROW_HEIGHT, startHeight + (e.clientY - startY)));
        target.releasePointerCapture(e.pointerId);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
        dragCleanupRef.current = null;
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', up);
      dragCleanupRef.current = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', up);
      };
    },
    [index, setRowHeight],
  );

  const handleDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      setRowHeight(index, DEFAULT_ROW_HEIGHT);
    },
    [index, setRowHeight],
  );

  return (
    <div
      className="cellforge-resize-handle cellforge-row-resize-handle"
      role="separator"
      aria-orientation="horizontal"
      aria-label={`Resize row ${index + 1}`}
      data-resize-row={index}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(event) => event.stopPropagation()}
    />
  );
}
