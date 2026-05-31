# Contributing to cellforge

Thank you for your interest in contributing. This document covers the development workflow, commit style, and release process.

## Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8 (`npm install -g pnpm`)

## Setup

```bash
git clone https://github.com/krjani-dev/cellforge.git
cd cellforge
pnpm install
```

## Development

```bash
pnpm dev             # start Storybook on http://localhost:6006
pnpm build           # type-check + production library build
pnpm test            # run Vitest test suite
pnpm typecheck       # TypeScript type-check only
pnpm lint            # ESLint
pnpm format:check    # Prettier check (no writes)
pnpm size            # enforce bundle size budget
pnpm build-storybook # static Storybook build
```

## Branching

| Branch pattern | Purpose |
|---|---|
| `main` | Latest published state — always releasable |
| `feat/<slug>` | New features |
| `fix/<slug>` | Bug fixes |
| `docs/<slug>` | Documentation only |
| `chore/<slug>` | Tooling, deps, CI |

Open all PRs against `main`.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `chore`, `perf`, `refactor`, `test`.

Examples:
```
feat(toolbar): add bold/italic/underline buttons
fix(keyboard): arrow keys skip merged cells correctly
docs: clarify ESM-only constraint in README
```

- Use present tense, imperative mood ("add" not "added")
- Keep the subject line under 72 characters
- No trailing period

## Pull requests

- Keep each PR focused on one concern
- Add or update tests for any changed behaviour
- Run the full CI suite locally before pushing:
  ```bash
  pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm size && pnpm build-storybook
  ```
- Fill in the PR template — a description and a brief test plan

## Bundle budget

cellforge has a hard core budget of ≤ 220 KB (minified + gzipped). New dependencies must fit within this budget. XLSX, CSV, PDF, and similar heavy addons must live behind `cellforge/io/*` subpaths — never in the core bundle. Check `doc/BUNDLE_BUDGET.md` before adding any dependency.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/BUG_REPORT.md) on GitHub Issues.

## Proposing features

Open an issue with the [feature request template](.github/ISSUE_TEMPLATE/FEATURE_REQUEST.md). Check [ROADMAP.md](./ROADMAP.md) first — your idea may already be planned.

## Code of conduct

This project has a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating you agree to abide by its terms.

## License

By contributing you agree that your contributions will be licensed under the [MIT License](./LICENSE).
