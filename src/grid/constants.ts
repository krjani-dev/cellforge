export const DEFAULT_ROW_HEIGHT = 24;
export const DEFAULT_COLUMN_WIDTH = 96;
export const MIN_ROW_HEIGHT = 16;
export const MIN_COLUMN_WIDTH = 32;

export function getColumnWidth(width: number | undefined): number {
  return width ?? DEFAULT_COLUMN_WIDTH;
}

export function getRowHeight(height: number | undefined): number {
  return height ?? DEFAULT_ROW_HEIGHT;
}
