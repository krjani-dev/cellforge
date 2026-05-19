import { forwardRef } from 'react';
import type { ElementRef } from 'react';
import * as Menu from '@radix-ui/react-context-menu';
import { useSpreadsheetStore } from '../store';

function MenuItem({
  label,
  onSelect,
  disabled,
}: {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Menu.Item
      className="cellforge-menu-item"
      disabled={disabled ?? false}
      onSelect={() => {
        onSelect();
      }}
    >
      {label}
    </Menu.Item>
  );
}

function MenuSeparator() {
  return <Menu.Separator className="cellforge-menu-separator" />;
}

export type MenuContentRef = ElementRef<typeof Menu.Content>;

export const CellMenuContent = forwardRef<MenuContentRef>((_, ref) => {
  return (
    <Menu.Content ref={ref} className="cellforge-menu" onClick={(e) => e.stopPropagation()}>
      <MenuItem label="Clear values" onSelect={() => useSpreadsheetStore.getState().clearCells()} />
      <MenuSeparator />
      <MenuItem
        label="Insert row above"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.insertRow(s.selection.anchor.row);
        }}
      />
      <MenuItem
        label="Insert row below"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.insertRow(s.selection.anchor.row + 1);
        }}
      />
      <MenuItem
        label="Delete row"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.deleteRow(s.selection.anchor.row);
        }}
      />
      <MenuSeparator />
      <MenuItem
        label="Insert column left"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.insertColumn(s.selection.anchor.col);
        }}
      />
      <MenuItem
        label="Insert column right"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.insertColumn(s.selection.anchor.col + 1);
        }}
      />
      <MenuItem
        label="Delete column"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.deleteColumn(s.selection.anchor.col);
        }}
      />
    </Menu.Content>
  );
});

export const RowMenuContent = forwardRef<MenuContentRef>((_, ref) => {
  return (
    <Menu.Content ref={ref} className="cellforge-menu" onClick={(e) => e.stopPropagation()}>
      <MenuItem
        label="Insert row above"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.insertRow(s.selection.anchor.row);
        }}
      />
      <MenuItem
        label="Insert row below"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.insertRow(s.selection.anchor.row + 1);
        }}
      />
      <MenuItem
        label="Delete row"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.deleteRow(s.selection.anchor.row);
        }}
      />
      <MenuSeparator />
      <MenuItem label="Clear values" onSelect={() => useSpreadsheetStore.getState().clearCells()} />
    </Menu.Content>
  );
});

export const ColumnMenuContent = forwardRef<MenuContentRef>((_, ref) => {
  return (
    <Menu.Content ref={ref} className="cellforge-menu" onClick={(e) => e.stopPropagation()}>
      <MenuItem
        label="Insert column left"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.insertColumn(s.selection.anchor.col);
        }}
      />
      <MenuItem
        label="Insert column right"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.insertColumn(s.selection.anchor.col + 1);
        }}
      />
      <MenuItem
        label="Delete column"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.deleteColumn(s.selection.anchor.col);
        }}
      />
      <MenuSeparator />
      <MenuItem label="Clear values" onSelect={() => useSpreadsheetStore.getState().clearCells()} />
    </Menu.Content>
  );
});

export const CornerMenuContent = forwardRef<MenuContentRef>((_, ref) => {
  return (
    <Menu.Content ref={ref} className="cellforge-menu" onClick={(e) => e.stopPropagation()}>
      <MenuItem label="Select all" onSelect={() => useSpreadsheetStore.getState().selectAll()} />
      <MenuItem
        label="Clear all values"
        onSelect={() => {
          const s = useSpreadsheetStore.getState();
          s.clearCells({
            start: { row: 0, col: 0 },
            end: { row: s.rowCount - 1, col: s.columnCount - 1 },
          });
        }}
      />
    </Menu.Content>
  );
});

CellMenuContent.displayName = 'CellMenuContent';
RowMenuContent.displayName = 'RowMenuContent';
ColumnMenuContent.displayName = 'ColumnMenuContent';
CornerMenuContent.displayName = 'CornerMenuContent';
