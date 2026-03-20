# @spectotal/direc-monorepo

This repository is an npm workspace monorepo for `direc`.

- `packages/direc`: the publishable CLI package that users can run with `npx direc` or install globally with `npm install -g direc`

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
