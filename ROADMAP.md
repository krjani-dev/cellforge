# Roadmap

Current version: **v0.0.4** — Install the current pre-alpha build with `npm install cellforge@dev`.

---

## Available today

A lightweight, MIT-licensed, React-first spreadsheet grid for apps that need more control than a vendor widget allows.

- [x] Virtualized grid with smooth scrolling and fixed row/column headers
- [x] Single-cell, range, row, column, and select-all selection
- [x] Keyboard navigation (arrows, Tab, Enter, Home/End, Ctrl+Arrow)
- [x] In-place cell editing with commit/cancel
- [x] Row and column resize
- [x] Right-click context menu — insert, delete, and clear rows and columns
- [x] `onDataChange` prop — dense 2D snapshot on every data change
- [x] `getData()` imperative ref handle — pull snapshot on demand
- [x] `CellValue` and `SpreadsheetHandle` types exported
- [x] WAI-ARIA grid pattern compliance

---

## Known limitations

- ESM-only package (`"type": "module"`); CommonJS `require()` is not supported
- Single spreadsheet instance per page for now; multiple instances still share state
- `initialData` is uncontrolled after mount; reload by remounting with a new `key`
- Addon subpath exports (`cellforge/io/xlsx`, etc.) import successfully but throw at call time until their milestone ships

---

## Release conventions

Milestone headings show the intended feature scope. Version numbers are targets — they may shift if intermediate bug-fix patches ship before a milestone is complete.

- **Bug fixes and performance improvements** may ship as intermediate patch releases (`0.0.x`, `0.1.x`, etc.) at any time, independently of milestone progress.
- **Milestone versions** (e.g. `v0.1.0-alpha`) are tagged when the full feature set for that milestone is ready — not before.
- **Compatibility:** we aim to avoid breaking changes within a dist-tag line (`@dev`, `@alpha`, `@beta`, `@next`), but pre-1.0 builds may still evolve. Breaking changes are documented in the [CHANGELOG](./CHANGELOG.md).

---

## v0.0.5 — Toolbar & Basic Formatting

Formatting toolbar, number formats, and format painter.

- [ ] Toolbar with bold, italic, underline, text colour, background, alignment, and borders
- [ ] Number formats — currency, percent, date, time, decimals, and custom patterns
- [ ] Format painter

---

## v0.0.6 — Formulas, Multi-sheet & Undo

Formula engine, multi-sheet workbooks, and undo/redo.

- [ ] Formula engine (HyperFormula integration)
- [ ] Formula bar for inspecting and editing cell formulas
- [ ] Named ranges
- [ ] Custom formula functions
- [ ] Multi-sheet workbook (add, rename, remove, reorder sheets)
- [ ] Cross-sheet formula references
- [ ] Undo and redo

---

## v0.1.0-alpha — React API & Clipboard

First public release under the `@alpha` dist-tag. React extensibility and clipboard support.

- [ ] Custom cell renderers — render any React component inside a cell (status pills, avatars, links, buttons)
- [ ] Custom editors — provide editors for dates, selects, or domain objects with typed context and commit/cancel callbacks
- [ ] Core event hooks — `onSelectionChange`, `onEditStart`, `onEditCommit`
- [ ] CSS variable theming — fit cellforge into any design system without heavy style overrides
- [ ] Copy, cut, and paste (internal + Excel/TSV-compatible external paste)
- [ ] JSON workbook persistence format

---

## v0.1.1-alpha — I/O & Localization

Import/export addons and localization infrastructure.

- [ ] `cellforge/io/xlsx` — XLSX import and export
- [ ] `cellforge/io/csv` — CSV import and export
- [ ] `cellforge/io/pdf` — PDF export
- [ ] `cellforge/editors/date` — richer date editor
- [ ] `cellforge/migration/webix` — Webix-format JSON migration helper
- [ ] Locale infrastructure (English bundled)
- [ ] `cellforge/locales/fr` — French locale pack

---

## v0.2.0-beta — Data Features

Broader public release under the `@beta` dist-tag. Sorting, filtering, validation, and conditional formatting.

- [ ] Sorting by one or more columns
- [ ] Column filters (hides rows without mutating workbook data)
- [ ] Find and replace (value and formula modes)
- [ ] Data validation (dropdowns, required values, number ranges, regex)
- [ ] Conditional formatting
- [ ] Extended event hooks — `onFormulaError`, `onValidationError`, workbook change events

---

## v0.2.1-beta — UX & Workbook Features

Frozen panes, merged cells, comments, protection, and permissions.

- [ ] Frozen rows and columns
- [ ] Merged cells
- [ ] Cell comments and notes
- [ ] Hide and show rows/columns
- [ ] Print preview
- [ ] Sheet protection (block editing of locked cells while still allowing selection)
- [ ] Granular permissions — cell, range, and sheet-level rules that block editing while still allowing viewing and selection

---

## v0.3.0-rc — Performance Pass

Feature freeze. Performance targets required before stable.

- [ ] 100K-cell smooth rendering
- [ ] Formula recalculation in a Web Worker
- [ ] ≥ 50 fps scroll on large sheets
- [ ] < 200 ms recalc on a 100K-cell change
- [ ] Canvas overlay path (if DOM virtualization cannot hit targets)

---

## v1.0.0 — Stable

First stable release. `npm install cellforge` (no tag) resolves.

- [ ] All `v0.3.0-rc` features confirmed stable in production
- [ ] Public API frozen — no breaking changes in `1.x`
- [ ] Per-chunk bundle budgets enforced as part of the API surface
- [ ] Documentation and migration guide complete

---

## Planned addons

These subpath exports already exist in the package and import without error, but they throw at call time until their milestone ships.

| Subpath | What it provides |
|---|---|
| `cellforge/io/xlsx` | XLSX import and export |
| `cellforge/io/csv` | CSV import and export |
| `cellforge/io/pdf` | PDF export |
| `cellforge/migration/webix` | Webix-format JSON migration helper |
| `cellforge/editors/date` | Richer date editor |
| `cellforge/locales/fr` | French locale pack |
