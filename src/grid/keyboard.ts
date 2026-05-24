import type { KeyboardEvent } from 'react';
import type { NavDirection } from '../store';
import { useSpreadsheetStore } from '../store';

type DirectionAfterCommit = 'down' | 'up' | 'right' | 'left' | 'none';

function commitAndMove(direction: DirectionAfterCommit) {
  const store = useSpreadsheetStore.getState();
  store.commitEditing();
  if (direction === 'none') return;
  const dirMap: Record<Exclude<DirectionAfterCommit, 'none'>, NavDirection> = {
    down: 'down',
    up: 'up',
    right: 'right',
    left: 'left',
  };
  store.moveAnchor(dirMap[direction]);
}

function isPrintableKey(event: KeyboardEvent<HTMLDivElement>): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return event.key.length === 1;
}

export function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, focusRoot: () => void) {
  const store = useSpreadsheetStore.getState();
  const editing = store.editing;

  if (editing) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        commitAndMove(event.shiftKey ? 'up' : 'down');
        focusRoot();
        return;
      case 'Tab':
        event.preventDefault();
        commitAndMove(event.shiftKey ? 'left' : 'right');
        focusRoot();
        return;
      case 'Escape':
        event.preventDefault();
        store.cancelEditing();
        focusRoot();
        return;
      case 'ArrowUp':
        event.preventDefault();
        commitAndMove('up');
        focusRoot();
        return;
      case 'ArrowDown':
        event.preventDefault();
        commitAndMove('down');
        focusRoot();
        return;
      case 'ArrowLeft':
        event.preventDefault();
        commitAndMove('left');
        focusRoot();
        return;
      case 'ArrowRight':
        event.preventDefault();
        commitAndMove('right');
        focusRoot();
        return;
      default:
        return;
    }
  }

  const { ctrlKey, metaKey, shiftKey, key } = event;
  const ctrlOrMeta = ctrlKey || metaKey;
  const extend = shiftKey;

  switch (key) {
    case 'ArrowUp':
      event.preventDefault();
      store.moveAnchor(ctrlOrMeta ? 'dataEdgeUp' : 'up', { extend });
      return;
    case 'ArrowDown':
      event.preventDefault();
      store.moveAnchor(ctrlOrMeta ? 'dataEdgeDown' : 'down', { extend });
      return;
    case 'ArrowLeft':
      event.preventDefault();
      store.moveAnchor(ctrlOrMeta ? 'dataEdgeLeft' : 'left', { extend });
      return;
    case 'ArrowRight':
      event.preventDefault();
      store.moveAnchor(ctrlOrMeta ? 'dataEdgeRight' : 'right', { extend });
      return;
    case 'Tab':
      event.preventDefault();
      store.moveAnchor(shiftKey ? 'left' : 'right');
      return;
    case 'Enter':
    case 'F2': {
      event.preventDefault();
      const anchor = store.selection.anchor;
      store.startEditing(anchor.row, anchor.col);
      return;
    }
    case 'PageUp':
      event.preventDefault();
      store.moveAnchor('pageUp', { extend });
      return;
    case 'PageDown':
      event.preventDefault();
      store.moveAnchor('pageDown', { extend });
      return;
    case 'Home':
      event.preventDefault();
      store.moveAnchor(ctrlOrMeta ? 'gridStart' : 'home', { extend });
      return;
    case 'End':
      event.preventDefault();
      store.moveAnchor(ctrlOrMeta ? 'gridEnd' : 'end', { extend });
      return;
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      store.clearCells();
      return;
    case 'Escape':
      event.preventDefault();
      store.resetSelection();
      return;
    default:
      if (ctrlOrMeta && (key === 'a' || key === 'A')) {
        event.preventDefault();
        store.selectAll();
        return;
      }
      if (isPrintableKey(event)) {
        event.preventDefault();
        const anchor = store.selection.anchor;
        store.startEditing(anchor.row, anchor.col, key);
      }
  }
}
