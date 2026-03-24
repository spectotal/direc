# @spectotal/direc-monorepo

This repository is an npm workspace monorepo for `direc`.

- `packages/cli/direc`: the publishable CLI package that users can run with `npx direc` or install globally with `npm install -g direc`
- `packages/core/analysis-runtime`: vendor-independent analyzer execution and persistence
- `packages/core/automation-runtime`: workflow-driven subagent request and result orchestration
- `packages/facets/detect`: repository facet detection with evidence and scope metadata
- `packages/adapters/openspec`: OpenSpec event normalization and watch support
- `packages/plugins/js-complexity`: JavaScript and TypeScript complexity analyzer plugin
- `packages/plugins/js-architecture-drift`: JavaScript and TypeScript dependency drift analyzer plugin

## Workspace commands

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

## Local CLI development

```bash
npm run dev:direc -- --help
npm run dev:direc -- init
npm run dev:direc -- run specs/example.spec.md --dry-run
npm run dev:direc -- analyze
npm run dev:direc -- analyze --watch
npm run dev:direc -- automate --workflow openspec
```

## Direc Analysis Bootstrap

Direc now stores repository-local analysis state under `.direc/`:

- `.direc/config.json`: facet IDs and enabled analyzers
- `.direc/latest/`: latest analyzer snapshots
- `.direc/history/`: event-linked analyzer history
- `.direc/automation/requests/`: formalized subagent request envelopes
- `.direc/automation/results/`: formalized subagent results
- `.direc/automation/latest/`: latest per-change automation status

The generated config now includes default analyzer tuning:

- non-production path exclusions for fixtures, tests, declaration files, `dist`, and `scripts/`
- warning and error complexity thresholds
- initial architecture boundary rules that keep `packages/cli/direc/src/lib` isolated from command handlers and keep OpenSpec status or event logic isolated from watch orchestration
- an automation profile with advisory mode, hybrid invocation, command transport, and OpenSpec task-diff plus change-complete triggers

Typical workflow:

```bash
npm run dev:direc -- init
npm run dev:direc -- doctor
npm run dev:direc -- analyze
npm run dev:direc -- analyze --change my-change
npm run dev:direc -- analyze --change my-change --watch
npm run dev:direc -- automate --workflow openspec
```

## Pre-commit flow

The repo uses Husky plus lint-staged.

- staged JavaScript and TypeScript files run through ESLint and Prettier
- staged JSON, Markdown, and YAML files run through Prettier
- affected workspace packages run `typecheck`
- affected workspace packages run `test` when the package exposes a test script

## Publish the CLI

```bash
npm run build
npm publish --workspace=direc --access public
```

## Release Workflow

The repo uses Changesets to track package-level changes and produce version bumps plus changelogs.

```bash
# 1. Record a user-facing package change in your feature branch
npm run changeset

# 2. Inspect pending release state
npm run changeset:status

# 3. When main is ready to cut a release, version packages and changelogs
npm run release:version

# 4. Commit the generated version updates, then publish
npm run release:publish
```

Notes:

- Changeset files live in `.changeset/` and should be committed with the change they describe.
- `release:version` and `release:publish` require a clean git worktree.
- `release:publish` runs the repo checks before publishing to npm.
