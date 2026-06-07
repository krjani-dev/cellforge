import type { CellValue } from './types';

const NUMERIC_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

export function coerceValue(value: string): CellValue {
  if (value === '') return null;
  if (NUMERIC_RE.test(value)) {
    const n = Number(value);
    if (Number.isFinite(n)) return Object.is(n, -0) ? 0 : n;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}
