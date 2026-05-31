# cellforge

A lightweight, MIT-licensed, React-first spreadsheet grid for apps that need more control than a vendor widget allows.

## Current status

- **Version:** `v0.0.4` — pre-alpha, published under the `@dev` dist-tag
- **ESM-only:** no CommonJS build; `require('cellforge')` will throw `ERR_REQUIRE_ESM`
- **Single instance:** mounting two `<Spreadsheet>` components on the same page causes shared state — multi-instance support is a planned fix
- **Addon subpaths** (`cellforge/io/xlsx`, etc.) import without error but throw at call time — they are reserved placeholders until their milestone ships
- `npm install cellforge` (no tag) resolves only once `v1.0.0` ships stable

## Install

```bash
npm install cellforge@dev
# or
pnpm add cellforge@dev
```

### Peer dependencies

Install these alongside cellforge:

```bash
npm install react react-dom react-window zustand @radix-ui/react-context-menu
```

| Package | Required version |
|---|---|
| `react` | `>= 18.0.0` |
| `react-dom` | `>= 18.0.0` |
| `react-window` | `^2.2.7` |
| `zustand` | `^4.5.5` |
| `@radix-ui/react-context-menu` | `^2.2.16` |

### ESM-compatible toolchains

| Toolchain | Notes |
|---|---|
| **Vite** | Any version — works out of the box |
| **Next.js 13+** | App Router; or Next.js 12+ with `"type": "module"` in `package.json` |
| **webpack 5** | Requires `experiments.outputModule: true` or an ESM-aware loader |
| **Jest** | Requires `NODE_OPTIONS=--experimental-vm-modules`; or use Vitest / web-test-runner |

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

Use a ref to read or export cell data imperatively:

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
| `rows` | `number` | `100` | Total number of rows in the grid |
| `columns` | `number` | `26` | Total number of columns in the grid |
| `initialData` | `CellValue[][]` | — | Loaded once on mount; changes after mount are ignored |
| `onDataChange` | `(data: CellValue[][]) => void` | — | Called on every cell mutation with a full data snapshot |
| `className` | `string` | — | Extra CSS class on the root element |

## Exported types

| Type | Description |
|---|---|
| `CellValue` | Union of valid cell value types (`string \| number \| boolean \| null`) |
| `SpreadsheetHandle` | Ref handle shape — exposes `getData(): CellValue[][]` |

## What's available today

- Virtualized grid with smooth scrolling and fixed row/column headers
- Single-cell, range, row, column, and select-all selection
- Keyboard navigation (arrows, Tab, Enter, Home/End, Ctrl+Arrow, Page Up/Down)
- In-place cell editing — Enter/Tab commit and move, Escape cancel
- Row and column resize (drag header dividers)
- Right-click context menu — insert, delete, and clear rows and columns
- `onDataChange` prop — dense 2D snapshot on every cell mutation
- `getData()` imperative ref handle — pull snapshot on demand
- WAI-ARIA grid pattern compliance

## Release model

Releases follow a versioned milestone ladder: `0.0.x @dev` → `0.1.x-alpha @alpha` → `0.2.x-beta @beta` → `0.3.x-rc @next` → `1.0.0 @latest`.

Intermediate `0.0.x` patch releases may ship bug fixes and smaller improvements independently of milestone progress. Milestone version numbers are targets — they may shift if patches land first. See [ROADMAP.md](./ROADMAP.md) for the full feature plan and [CHANGELOG.md](./CHANGELOG.md) for release history.

## Known limitations

- **Single instance only** — two `<Spreadsheet>` components on the same page share state; there is currently no workaround for multiple simultaneous instances
- **`initialData` is uncontrolled** — to reload data, remount with a new `key`
- **ESM-only** — no CommonJS build
- **Addon subpaths are placeholders** — they import without error but throw at call time until their milestone ships

## License

[MIT](./LICENSE)
