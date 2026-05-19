# cellforge

A virtualized React spreadsheet grid. Pre-alpha — published under the `@dev` dist-tag for early testers.

`npm install cellforge` (no tag) will resolve once `v1.0.0` ships stable. Until then use an explicit dist-tag.

## ESM-only

cellforge is published as **ES modules only** (`"type": "module"`). There is no CommonJS build.

Consumers using `require('cellforge')` or toolchains that do not support ESM will get `ERR_REQUIRE_ESM`. Compatible setups include:

- **Vite** (any version)
- **Next.js 13+** with the App Router, or Next.js 12+ with `"type": "module"` in `package.json`
- **webpack 5** with `experiments.outputModule: true` or an ESM-aware loader
- **Jest** — requires `NODE_OPTIONS=--experimental-vm-modules` and `"transform": {}` in Jest config, or a test runner with native ESM support (Vitest, web-test-runner)

## Install

```bash
npm install cellforge@dev
# or
pnpm add cellforge@dev
```

## Usage

```tsx
import { Spreadsheet } from 'cellforge';
import type { CellValue, SpreadsheetHandle } from 'cellforge';
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
      onDataChange={(data) => console.log(data)}
    />
  );
}
```

### Ref API

Use a ref to read cell data imperatively:

```tsx
import { useRef } from 'react';
import { Spreadsheet } from 'cellforge';
import type { SpreadsheetHandle } from 'cellforge';

function App() {
  const ref = useRef<SpreadsheetHandle>(null);

  return (
    <>
      <Spreadsheet ref={ref} rows={10} columns={5} />
      <button onClick={() => console.log(ref.current?.getData())}>
        Export
      </button>
    </>
  );
}
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `number` | `100` | Number of visible rows |
| `columns` | `number` | `26` | Number of visible columns |
| `initialData` | `CellValue[][]` | — | Loaded once on mount; later changes are ignored |
| `onDataChange` | `(data: CellValue[][]) => void` | — | Called on every cell mutation with a full data snapshot |
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

The following subpath imports exist in the package exports but are **reserved placeholders** — they import successfully, but every exported function throws at call time until the addon is implemented:

- `cellforge/io/xlsx` — XLSX read/write
- `cellforge/io/csv` — CSV import/export
- `cellforge/io/pdf` — PDF export
- `cellforge/migration/webix` — Webix-format JSON reader
- `cellforge/editors/date` — date picker cell editor
- `cellforge/locales/fr` — French locale (exports `{ locale, messages }` but messages are empty; strings populate as features land)

Not yet in core either: formulas, named ranges, undo/redo, multi-sheet, formatting toolbar, clipboard, `onSelectionChange`.

## Known limitations

- **Single instance only.** Mounting two `<Spreadsheet>` components on the same page causes them to share and overwrite each other's state. Per-instance scoped stores are the next architectural milestone.
- `initialData` is uncontrolled — to reload data, remount with a new `key`.

## License

[MIT](./LICENSE)
