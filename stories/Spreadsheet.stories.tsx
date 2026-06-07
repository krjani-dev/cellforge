import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Spreadsheet } from '../src/index';
import type { CellValue, SpreadsheetHandle } from '../src/index';
import { useSpreadsheetStore } from '../src/store';

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

const FILL_VIEWPORT: CSSProperties = {
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
import 'cellforge/styles.css';

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
import 'cellforge/styles.css';

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
import 'cellforge/styles.css';

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
import 'cellforge/styles.css';

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
import 'cellforge/styles.css';

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
import 'cellforge/styles.css';

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
import 'cellforge/styles.css';

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

function OnDataChangeStory() {
  const [snapshot, setSnapshot] = useState<CellValue[][]>([]);
  const [changeCount, setChangeCount] = useState(0);
  const handleChange = useCallback((data: CellValue[][]) => {
    setSnapshot(data);
    setChangeCount((n) => n + 1);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Spreadsheet
          rows={5}
          columns={4}
          initialData={[
            ['Product', 'Units', 'Price'],
            ['Widget', 120, 9.99],
            ['Gadget', 85, 24.99],
          ]}
          onDataChange={handleChange}
        />
      </div>
      <div style={{ flexShrink: 0, borderTop: '1px solid #d0d7de' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 12px',
            background: '#f6f8fa',
            borderBottom: '1px solid #d0d7de',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: 'system-ui, sans-serif',
              color: '#57606a',
              fontWeight: 600,
            }}
          >
            onDataChange
          </span>
          {changeCount > 0 && (
            <span
              style={{
                background: '#0969da',
                color: '#fff',
                borderRadius: 10,
                padding: '1px 7px',
                fontSize: 10,
                fontWeight: 600,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {changeCount} {changeCount === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>
        <pre
          style={{
            margin: 0,
            padding: '10px 12px',
            background: '#f6f8fa',
            color: '#24292f',
            fontSize: 12,
            fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
            overflowY: 'auto',
            maxHeight: 150,
          }}
        >
          {snapshot.length === 0
            ? '// Edit a cell to see the live snapshot'
            : JSON.stringify(snapshot, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function GetDataRefStory() {
  const ref = useRef<SpreadsheetHandle>(null);
  const [snapshot, setSnapshot] = useState<CellValue[][] | null>(null);
  const [snapshotTime, setSnapshotTime] = useState<string | null>(null);
  const handleSnapshot = useCallback(() => {
    setSnapshot(ref.current?.getData() ?? null);
    setSnapshotTime(new Date().toLocaleTimeString());
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#fff',
          borderBottom: '1px solid #d0d7de',
        }}
      >
        <button
          onClick={handleSnapshot}
          style={{
            padding: '5px 12px',
            background: '#fff',
            border: '1px solid #d0d7de',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            color: '#24292f',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Snapshot
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Spreadsheet
          ref={ref}
          rows={5}
          columns={4}
          initialData={[
            ['Name', 'Q1', 'Q2'],
            ['Alice', 420, 510],
            ['Bob', 380, 430],
          ]}
        />
      </div>
      {snapshot && (
        <div style={{ flexShrink: 0, borderTop: '1px solid #d0d7de' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 12px',
              background: '#f6f8fa',
              borderBottom: '1px solid #d0d7de',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontFamily: 'system-ui, sans-serif',
                color: '#57606a',
                fontWeight: 600,
              }}
            >
              getData() result
            </span>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'system-ui, sans-serif',
                color: '#8c959f',
              }}
            >
              taken at {snapshotTime}
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '10px 12px',
              background: '#f6f8fa',
              color: '#24292f',
              fontSize: 12,
              fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
              overflowY: 'auto',
              maxHeight: 150,
            }}
          >
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export const OnDataChange: Story = {
  parameters: {
    docs: {
      description: {
        story: `
The \`onDataChange\` prop fires with a dense 2-D snapshot whenever cell data
changes — edits, paste, clear, or row/column insert/delete. Selection and
dimension changes do **not** trigger it.

The panel below the grid reflects the live snapshot. Use it to drive
downstream state (form validation, server sync, preview rendering, etc.).
        `,
      },
      source: {
        code: `import { useState } from 'react';
import { Spreadsheet } from 'cellforge';
import type { CellValue } from 'cellforge';
import 'cellforge/styles.css';

const initial = [
  ['Product', 'Units', 'Price'],
  ['Widget',     120,   9.99],
  ['Gadget',      85,  24.99],
];

export default function App() {
  const [snapshot, setSnapshot] = useState<CellValue[][]>([]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <Spreadsheet
          rows={5}
          columns={4}
          initialData={initial}
          onDataChange={setSnapshot}
        />
      </div>
      <pre style={{ margin: 0, padding: 12, background: '#f5f5f5', fontSize: 12, overflowY: 'auto', maxHeight: 160 }}>
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </div>
  );
}`,
      },
    },
  },
  render: () => <OnDataChangeStory />,
};

export const GetDataRef: Story = {
  parameters: {
    docs: {
      description: {
        story: `
The \`ref\` prop exposes an imperative handle with \`getData()\`, which returns
a dense 2-D snapshot on demand — useful for form submission, export buttons,
or any case where you want to pull data at a specific moment rather than
push on every change.

Click **Snapshot** to read the current grid state without subscribing to
every keystroke.
        `,
      },
      source: {
        code: `import { useRef, useState } from 'react';
import { Spreadsheet } from 'cellforge';
import type { SpreadsheetHandle, CellValue } from 'cellforge';
import 'cellforge/styles.css';

export default function App() {
  const ref = useRef<SpreadsheetHandle>(null);
  const [snapshot, setSnapshot] = useState<CellValue[][] | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e0e0e0' }}>
        <button onClick={() => setSnapshot(ref.current?.getData() ?? null)}>
          Snapshot
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <Spreadsheet
          ref={ref}
          rows={5}
          columns={4}
          initialData={[
            ['Name',  'Q1',  'Q2'],
            ['Alice',  420,   510],
            ['Bob',    380,   430],
          ]}
        />
      </div>
      {snapshot && (
        <pre style={{ margin: 0, padding: 12, background: '#f5f5f5', fontSize: 12, overflowY: 'auto', maxHeight: 160 }}>
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      )}
    </div>
  );
}`,
      },
    },
  },
  render: () => <GetDataRefStory />,
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
import 'cellforge/styles.css';

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

function CutIndicatorFixture(args: ComponentProps<typeof Spreadsheet>) {
  useEffect(() => {
    useSpreadsheetStore.getState().setPendingClipboard({
      mode: 'cut',
      range: { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
    });
    return () => useSpreadsheetStore.getState().setPendingClipboard(null);
  }, []);
  return <Spreadsheet {...args} />;
}

export const CutIndicator: Story = {
  args: {
    rows: 6,
    columns: 6,
    initialData: [
      ['Apple', 'Banana', 'Cherry', 'Date', 'Fig', 'Grape'],
      [10, 20, 30, 40, 50, 60],
      [11, 21, 31, 41, 51, 61],
      [12, 22, 32, 42, 52, 62],
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Cells B2–C3 are pre-set as the pending cut range to show the marching-ants indicator. ' +
          'In normal use this appears after Ctrl/Cmd+X and clears on the first Ctrl/Cmd+V.',
      },
    },
  },
  render: (args) => (
    <div style={{ width: 520, height: 280 }}>
      <CutIndicatorFixture {...args} />
    </div>
  ),
};

function CopyIndicatorFixture(args: ComponentProps<typeof Spreadsheet>) {
  useEffect(() => {
    useSpreadsheetStore.getState().setPendingClipboard({
      mode: 'copy',
      range: { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
    });
    return () => useSpreadsheetStore.getState().setPendingClipboard(null);
  }, []);
  return <Spreadsheet {...args} />;
}

export const CopyIndicator: Story = {
  args: {
    rows: 6,
    columns: 6,
    initialData: [
      ['Apple', 'Banana', 'Cherry', 'Date', 'Fig', 'Grape'],
      [10, 20, 30, 40, 50, 60],
      [11, 21, 31, 41, 51, 61],
      [12, 22, 32, 42, 52, 62],
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Cells B2–C3 are pre-set as the pending copy range to show the marching-ants indicator. ' +
          'In normal use this appears after Ctrl/Cmd+C and persists so the range can be pasted multiple times; ' +
          'it clears when another copy or cut is started, or when data is replaced.',
      },
    },
  },
  render: (args) => (
    <div style={{ width: 520, height: 280 }}>
      <CopyIndicatorFixture {...args} />
    </div>
  ),
};
