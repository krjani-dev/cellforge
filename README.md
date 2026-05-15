# cellforge

A virtualized React spreadsheet grid. Pre-alpha — published under the `@dev` dist-tag for early testers.

`npm install cellforge` (no tag) will resolve once `v1.0.0` ships stable. Until then use an explicit dist-tag.

## Install

```bash
npm install cellforge@dev
# or
pnpm add cellforge@dev
```

## Usage

```tsx
import { Spreadsheet } from 'cellforge';
import 'cellforge/styles.css';

export default function App() {
  return (
    <Spreadsheet
      rows={50}
      columns={20}
      initialData={[
        ['Name', 'Score'],
        ['Alice', 91],
        ['Bob', 84],
      ]}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `number` | `100` | Number of visible rows |
| `columns` | `number` | `26` | Number of visible columns |
| `initialData` | `CellValue[][]` | — | Loaded once on mount; later changes are ignored |
| `className` | `string` | — | Extra class on the root element |

## What works in 0.0.2

- Virtualized grid (DOM-based, `react-window`)
- Cell editing (inline editor — Enter/Tab commit and move, Escape cancel)
- Selection — single cell, click-drag range, keyboard extension (Shift+arrow)
- Keyboard navigation (arrow keys, Tab, Enter, Page Up/Down, Home/End)
- Row and column resizing (drag header dividers)
- Context menu (right-click)
- Row and column headers

## What is not implemented yet

The following subpath imports exist in the package exports but are **reserved placeholders** — importing them throws `notImplemented` at runtime:

- `cellforge/io/xlsx` — XLSX read/write
- `cellforge/io/csv` — CSV import/export
- `cellforge/io/pdf` — PDF export
- `cellforge/migration/webix` — Webix-format JSON reader
- `cellforge/editors/date` — date picker cell editor
- `cellforge/locales/fr` — French locale (exports `{ locale, messages }` but messages are empty; strings populate as features land)

Not yet in core either: formulas, named ranges, undo/redo, multi-sheet, formatting toolbar, clipboard, `onChange`, `onSelectionChange`.

## Known limitations

- **Single instance only.** Mounting two `<Spreadsheet>` components on the same page causes them to share and overwrite each other's state. Per-instance scoped stores are the next architectural milestone.
- `initialData` is uncontrolled — there is no `onChange` callback yet. To reload data, remount with a new `key`.

## License

[MIT](./LICENSE)
