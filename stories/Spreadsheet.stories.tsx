import type { Meta, StoryObj } from '@storybook/react';

import { Spreadsheet } from '../src/index';

const meta: Meta<typeof Spreadsheet> = {
  title: 'Components/Spreadsheet',
  component: Spreadsheet,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        // Each story in the Docs page renders in its own iframe so they don't
        // share the singleton store and can't overwrite each other.
        inline: false,
        iframeHeight: 480,
      },
      source: {
        language: 'tsx',
        format: true,
      },
      description: {
        component: `
Each story below mounts a fresh \`<Spreadsheet>\` — the store resets on mount so
state doesn't bleed between stories. Multi-instance support (per-Spreadsheet
store) is a future enhancement.

**Keyboard shortcuts** (focus inside the grid first):

| Action | Shortcut |
| --- | --- |
| Move anchor | Arrow keys |
| Extend selection | Shift + Arrow keys |
| Move to data edge | Ctrl/Cmd + Arrow keys |
| Page up / down | PageUp / PageDown (default 10 rows) |
| First/last col of row | Home / End |
| Top-left / bottom-right | Ctrl/Cmd + Home / End |
| Select all | Ctrl/Cmd + A |
| Start editing | Enter / F2 / any printable key |
| Commit + move down | Enter (Shift+Enter = up) |
| Commit + move right | Tab (Shift+Tab = left) |
| Cancel edit | Esc |
| Clear selection values | Backspace / Delete |

**Mouse**: left-click cells to select; shift-click extends; ctrl/cmd-click
adds a disjoint range; drag from a cell to live-select a range. Click row /
column headers to select the whole row / column; corner to select all.

**Right-click** any area for a context menu (cell / row / column / corner).
Resize columns by dragging the right edge of a column header; resize rows by
dragging the bottom edge of a row header. Double-click a handle to reset.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spreadsheet>;

const FILL_VIEWPORT: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
};

function colLabel(col: number): string {
  let label = '';
  let c = col;
  do {
    label = String.fromCharCode(65 + (c % 26)) + label;
    c = Math.floor(c / 26) - 1;
  } while (c >= 0);
  return label;
}

function makeGrid(rows: number, cols: number): (string | number)[][] {
  const header = Array.from({ length: cols }, (_, c) => colLabel(c));
  const body = Array.from({ length: rows - 1 }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r + 1) * (c + 1)),
  );
  return [header, ...body];
}

// ─── Scale stories — filled grids ────────────────────────────────────────────

export const EmptyDefault: Story = {
  args: {
    rows: 100,
    columns: 26,
  },
  parameters: {
    docs: {
      description: {
        story: 'A blank 100 × 26 sheet — the default workbook on first mount.',
      },
      source: {
        code: `import { Spreadsheet } from 'cellforge';
import 'cellforge/styles';

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Spreadsheet />
    </div>
  );
}`,
      },
    },
  },
  render: (args) => (
    <div style={FILL_VIEWPORT}>
      <Spreadsheet {...args} />
    </div>
  ),
};

export const DefaultFilledGrid: Story = {
  args: {
    rows: 100,
    columns: 26,
    initialData: makeGrid(100, 26),
  },
  parameters: {
    docs: {
      description: {
        story:
          'The full 100 × 26 default grid pre-filled with a deterministic multiplication table (column-letter headers in row 1, integer products in the body). Demonstrates the default grid size with every cell occupied.',
      },
      source: {
        code: `import { Spreadsheet } from 'cellforge';
import 'cellforge/styles';

function colLabel(col: number): string {
  let label = '';
  let c = col;
  do {
    label = String.fromCharCode(65 + (c % 26)) + label;
    c = Math.floor(c / 26) - 1;
  } while (c >= 0);
  return label;
}

function makeGrid(rows: number, cols: number): (string | number)[][] {
  const header = Array.from({ length: cols }, (_, c) => colLabel(c));
  const body = Array.from({ length: rows - 1 }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r + 1) * (c + 1)),
  );
  return [header, ...body];
}

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Spreadsheet rows={100} columns={26} initialData={makeGrid(100, 26)} />
    </div>
  );
}`,
      },
    },
  },
  render: (args) => (
    <div style={FILL_VIEWPORT}>
      <Spreadsheet {...args} />
    </div>
  ),
};

export const LargeGrid: Story = {
  args: {
    rows: 500,
    columns: 60,
    initialData: makeGrid(500, 60),
  },
  parameters: {
    docs: {
      description: {
        story:
          '500 × 60 grid, every cell filled with a deterministic value, demonstrating react-window virtualization under load. Scrolling stays smooth — only the visible viewport is in the DOM. Headers track the cell scroll position.',
      },
      source: {
        code: `import { Spreadsheet } from 'cellforge';
import 'cellforge/styles';

function colLabel(col: number): string {
  let label = '';
  let c = col;
  do {
    label = String.fromCharCode(65 + (c % 26)) + label;
    c = Math.floor(c / 26) - 1;
  } while (c >= 0);
  return label;
}

function makeGrid(rows: number, cols: number): (string | number)[][] {
  const header = Array.from({ length: cols }, (_, c) => colLabel(c));
  const body = Array.from({ length: rows - 1 }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r + 1) * (c + 1)),
  );
  return [header, ...body];
}

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Spreadsheet rows={500} columns={60} initialData={makeGrid(500, 60)} />
    </div>
  );
}`,
      },
    },
  },
  render: (args) => (
    <div style={FILL_VIEWPORT}>
      <Spreadsheet {...args} />
    </div>
  ),
};

// ─── Feature stories — tight grids ───────────────────────────────────────────

export const WithInitialData: Story = {
  args: {
    rows: 5,
    columns: 5,
    initialData: [
      ['Region', 'Q1', 'Q2', 'Q3', 'Q4'],
      ['North', 1200, 1425, 1390, 1510],
      ['South', 980, 1110, 1185, 1230],
      ['East', 1320, 1280, 1450, 1390],
      ['West', 1510, 1495, 1620, 1700],
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'A small dataset loaded via the `initialData` prop. `rows` and `columns` are clamped to the data shape so the grid presents as a clean import/data-loading demo. Click any cell, press F2 to edit, Enter to commit.',
      },
      source: {
        code: `import { Spreadsheet } from 'cellforge';
import 'cellforge/styles';

const data = [
  ['Region', 'Q1', 'Q2', 'Q3', 'Q4'],
  ['North', 1200, 1425, 1390, 1510],
  ['South',  980, 1110, 1185, 1230],
  ['East',  1320, 1280, 1450, 1390],
  ['West',  1510, 1495, 1620, 1700],
];

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Spreadsheet rows={5} columns={5} initialData={data} />
    </div>
  );
}`,
      },
    },
  },
  render: (args) => (
    <div style={FILL_VIEWPORT}>
      <Spreadsheet {...args} />
    </div>
  ),
};

export const WideText: Story = {
  args: {
    rows: 5,
    columns: 3,
    initialData: [
      ['Long descriptive label that exceeds the default column width', 'Short', 12345.678],
      ['Q1 2026 revenue (USD)', 'Item 1', 8200],
      ['Q1 2026 returns (USD)', 'Item 2', -120],
      ['Q1 2026 net (USD)', 'Item 3', 8080],
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Long values truncate with ellipsis in their cells. Drag the right edge of column A to widen it and the full label becomes visible. Double-click the drag handle to reset to the default 96 px width.',
      },
      source: {
        code: `import { Spreadsheet } from 'cellforge';
import 'cellforge/styles';

const data = [
  ['Long descriptive label that exceeds the default column width', 'Short', 12345.678],
  ['Q1 2026 revenue (USD)', 'Item 1',  8200],
  ['Q1 2026 returns (USD)', 'Item 2',  -120],
  ['Q1 2026 net (USD)',     'Item 3',  8080],
];

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Spreadsheet rows={5} columns={3} initialData={data} />
    </div>
  );
}`,
      },
    },
  },
  render: (args) => (
    <div style={FILL_VIEWPORT}>
      <Spreadsheet {...args} />
    </div>
  ),
};

export const ContextMenuShowcase: Story = {
  args: {
    rows: 5,
    columns: 5,
    initialData: [
      ['A', 'B', 'C', 'D'],
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
    ],
  },
  parameters: {
    docs: {
      description: {
        story: `
Right-click anywhere to open an area-specific menu:

- **Cells** → Clear values, Insert/Delete row + column
- **Row headers** → Insert/Delete row, Clear values
- **Column headers** → Insert/Delete column, Clear values
- **Top-left corner** → Select all, Clear all values

If you right-click outside the current selection, the anchor moves to the
target first (standard Excel semantics) so the menu acts on what you pointed at.
        `,
      },
      source: {
        code: `import { Spreadsheet } from 'cellforge';
import 'cellforge/styles';

const data = [
  ['A', 'B', 'C', 'D'],
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
];

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Spreadsheet rows={5} columns={5} initialData={data} />
    </div>
  );
}`,
      },
    },
  },
  render: (args) => (
    <div style={FILL_VIEWPORT}>
      <Spreadsheet {...args} />
    </div>
  ),
};

export const TallRow: Story = {
  args: {
    rows: 5,
    columns: 2,
    initialData: [['Row 1'], ['Row 2 (tall)'], ['Row 3']],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Drag the bottom edge of any row header to resize that row. Double-click the handle to reset to the default 24 px height. Mid-drag the rest of the grid reflows to accommodate.',
      },
      source: {
        code: `import { Spreadsheet } from 'cellforge';
import 'cellforge/styles';

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Spreadsheet rows={5} columns={2} initialData={[['Row 1'], ['Row 2 (tall)'], ['Row 3']]} />
    </div>
  );
}`,
      },
    },
  },
  render: (args) => (
    <div style={FILL_VIEWPORT}>
      <Spreadsheet {...args} />
    </div>
  ),
};

export const SmallEmbedded: Story = {
  args: {
    rows: 6,
    columns: 4,
    initialData: [
      ['Name', 'Score'],
      ['Alice', 92],
      ['Bob', 88],
      ['Carol', 95],
    ],
  },
  parameters: {
    layout: 'centered',
    docs: {
      story: {
        inline: false,
        iframeHeight: 280,
      },
      description: {
        story:
          'A compact 6 × 4 grid sized for embedding inside a card or dialog. The `rows` and `columns` props set the exact visible grid dimensions (clamped to at least 1).',
      },
      source: {
        code: `import { Spreadsheet } from 'cellforge';
import 'cellforge/styles';

const data = [
  ['Name', 'Score'],
  ['Alice', 92],
  ['Bob',   88],
  ['Carol', 95],
];

export default function App() {
  return (
    <div style={{ width: 480, height: 220 }}>
      <Spreadsheet rows={6} columns={4} initialData={data} />
    </div>
  );
}`,
      },
    },
  },
  render: (args) => (
    <div style={{ width: 480, height: 220 }}>
      <Spreadsheet {...args} />
    </div>
  ),
};
