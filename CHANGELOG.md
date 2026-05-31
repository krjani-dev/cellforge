# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- `react-window`, `zustand`, and `@radix-ui/react-context-menu` moved from `peerDependencies` to `dependencies` — they are now installed automatically and no longer need to be listed in your app's own dependencies

### CI
- npm publish automated via GitHub Actions on version tag push

## [0.0.4] – 2026-05-24

### Fixed
- Keyboard navigation: arrow keys now move correctly across all edge cases
- Focus tracking: grid regains focus reliably after pointer and keyboard interactions
- Scroll preservation: viewport position is maintained when re-rendering
- Active cell on select-all: `Ctrl+A` / `Cmd+A` highlights the active cell consistently

## [0.0.3] – 2026-05-19

### Added
- `onDataChange` prop — receives a dense 2D snapshot on every data change
- `getData()` imperative handle via `ref` — pull a snapshot on demand
- `CellValue` type exported from the public API

### Fixed
- Grid focus restored after Tab, Enter, or Escape closes the editor
- In-progress edit committed on editor blur
- `useLayoutEffect` used for workbook init to prevent stale-state flash
- Context menu closes on select (removed `preventDefault` that blocked it)
- Resize handle pointer listeners and `rAF` cancelled on unmount
- Previous resize drag cancelled on re-entrant `pointerdown`
- Header sync uses `onScroll` prop; native scroll listener removed
- Duplicate scroll handler on `VirtualGrid` removed
- Active editor committed on all selection-changing pointer events
- Viewport scrolls to anchor after keyboard navigation
- Scroll targets active selection edge, not only anchor
- `replaceData` respects existing dimensions and never grows them
- WAI-ARIA grid pattern violations resolved
- Runtime deps moved to `peerDependencies` and marked as external in bundle
- `Ctrl+Arrow` matches Excel behaviour for non-empty cell with empty neighbour

### Performance
- Merged four Zustand subscriptions into one with `useShallow` in `Cell`

## [0.0.2] – 2026-05-15

### Added
- Virtualized spreadsheet grid with cell editing, range selection, keyboard navigation, and row/column resize

## [0.0.1] – 2026-05-07

### Added
- Initial project scaffold

[0.0.4]: https://github.com/krjani-dev/cellforge/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/krjani-dev/cellforge/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/krjani-dev/cellforge/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/krjani-dev/cellforge/releases/tag/v0.0.1
