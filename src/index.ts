// Public entry for the cellforge core package.
//
// This file MUST stay free of imports from heavy dependencies (ExcelJS, jsPDF,
// html2canvas, PapaParse, react-day-picker, numbro, non-en locale catalogs)
// and MUST NOT import any `cellforge/*` subpath. Addons live behind their own
// entries — see vite.config.ts and package.json `exports`.

export { Spreadsheet } from './Spreadsheet';
export type { SpreadsheetProps, SpreadsheetHandle } from './Spreadsheet';
export type { CellValue } from './store';
