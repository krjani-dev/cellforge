/**
 * Layout-aware virtualization tests for ColumnHeaderStrip and RowHeaderStrip.
 *
 * JSDOM's ResizeObserver stub is a no-op, so viewportWidth/viewportHeight stays
 * 0 and the strips fall back to rendering everything — meaning the existing
 * Spreadsheet.test.tsx tests never exercise the virtual path.
 *
 * These tests replace the global ResizeObserver with a version that immediately
 * reports real dimensions and updates clientWidth/clientHeight on the observed
 * element, making the components behave as they would in a real browser.
 */
import { useRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSpreadsheetStore } from '../store';
import { ColumnHeaderStrip, RowHeaderStrip } from './Headers';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function ColWrapper({ scrollOffset }: { scrollOffset: number }) {
  const stripRef = useRef<HTMLDivElement>(null);
  return <ColumnHeaderStrip stripRef={stripRef} scrollOffset={scrollOffset} />;
}

function RowWrapper({ scrollOffset }: { scrollOffset: number }) {
  const stripRef = useRef<HTMLDivElement>(null);
  return <RowHeaderStrip stripRef={stripRef} scrollOffset={scrollOffset} />;
}

/**
 * Replaces the global ResizeObserver with one that:
 * - Sets `clientWidth` / `clientHeight` on any observed element, and
 * - Immediately fires the callback so `useLayoutEffect` inside the strip
 *   components sees real dimensions on the first render.
 *
 * Returns a restore function to call after the test.
 */
function installMeasuringRO(width: number, height: number): () => void {
  const orig = global.ResizeObserver;
  global.ResizeObserver = class {
    private cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe(el: Element) {
      Object.defineProperty(el, 'clientWidth', { get: () => width, configurable: true });
      Object.defineProperty(el, 'clientHeight', { get: () => height, configurable: true });
      this.cb(
        [{ target: el, contentRect: { width, height } } as unknown as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  return () => {
    global.ResizeObserver = orig;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_COL_W = 96;
const DEFAULT_ROW_H = 24;

describe('header strip virtualization (browser-like dimensions)', () => {
  beforeEach(() => {
    useSpreadsheetStore.setState(
      {
        cells: {},
        columnCount: 20,
        rowCount: 20,
        colWidths: {},
        rowHeights: {},
        selection: {
          anchor: { row: 0, col: 0 },
          ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
          mode: 'cell',
        },
        editing: null,
      },
      false,
    );
  });

  // Holds the teardown for whichever ResizeObserver mock the current test
  // installed.  afterEach calls it unconditionally so the global is always
  // restored, even if render() throws mid-test.
  let restoreRO: () => void = () => {};

  afterEach(() => {
    restoreRO();
    restoreRO = () => {};
    cleanup();
  });

  it('column strip renders only the visible window when the viewport is measured', () => {
    // Viewport = 3 columns (288 px).  Scrolled right by 3 columns (288 px).
    //
    // acc = [0, 96, 192, 288, 384, 480, 576, …]
    // bisectRight(acc, 288) → 4   (acc[4]=384 is the first entry > 288)
    // raw  = max(0, 4 − 1 − OVERSCAN=2) = 1
    // visEnd = 288 + 288 = 576
    // scan from e=1 while acc[e+1] < 576: e → 2 → 3 → 4 → 5 (acc[6]=576 not < 576)
    // e = min(19, 5 + 2) = 7
    // Rendered window: columns 1–7  →  B … H
    restoreRO = installMeasuringRO(3 * DEFAULT_COL_W, 400);
    render(<ColWrapper scrollOffset={3 * DEFAULT_COL_W} />);

    expect(screen.queryByText('A')).not.toBeInTheDocument(); // col 0  – clipped before window
    expect(screen.getByText('B')).toBeInTheDocument(); // col 1  – window start
    expect(screen.getByText('H')).toBeInTheDocument(); // col 7  – window end
    expect(screen.queryByText('I')).not.toBeInTheDocument(); // col 8  – clipped after window
    expect(screen.queryByText('T')).not.toBeInTheDocument(); // col 19 – far past window
  });

  it('row strip renders only the visible window when the viewport is measured', () => {
    // Viewport = 3 rows (72 px).  Scrolled down by 3 rows (72 px).
    //
    // acc = [0, 24, 48, 72, 96, 120, 144, …]
    // bisectRight(acc, 72) → 4   (acc[4]=96 is the first entry > 72)
    // raw  = max(0, 4 − 1 − OVERSCAN=2) = 1
    // visEnd = 72 + 72 = 144
    // scan from e=1 while acc[e+1] < 144: e → 2 → 3 → 4 → 5 (acc[6]=144 not < 144)
    // e = min(19, 5 + 2) = 7
    // Rendered window: rows 1–7  →  labels "2" … "8"
    restoreRO = installMeasuringRO(100, 3 * DEFAULT_ROW_H);
    render(<RowWrapper scrollOffset={3 * DEFAULT_ROW_H} />);

    expect(screen.queryByText('1')).not.toBeInTheDocument(); // row 0  – clipped before window
    expect(screen.getByText('2')).toBeInTheDocument(); // row 1  – window start
    expect(screen.getByText('8')).toBeInTheDocument(); // row 7  – window end
    expect(screen.queryByText('9')).not.toBeInTheDocument(); // row 8  – clipped after window
    expect(screen.queryByText('20')).not.toBeInTheDocument(); // row 19 – far past window
  });
});
