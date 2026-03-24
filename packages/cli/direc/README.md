# direc

`direc` is a spec-driven development CLI. The package is publishable as `direc`, so users can invoke it with `npx direc` or install it globally with `npm install -g direc`.

## What is included

- TypeScript CLI source with a `bin` entrypoint
- `init`, `run`, `analyze`, and `doctor` commands
- Build scripts for local development and npm publishing
- A generated `.direc/config.json` plus analyzer reports under `.direc/`
- An example spec template for bootstrap repositories

## Install

```bash
npx direc --help
npm install -g direc
direc --help
```

## Commands

```bash
direc init
direc analyze
direc analyze --change my-change --watch
direc doctor
direc run specs/example.spec.md --dry-run
```

## Init and Analysis Bootstrap

`direc init` detects repository facets, enables matching analyzers, and writes `.direc/config.json`.

```bash
direc init
cat .direc/config.json
```

If `.direc/config.json` already exists, rerun with `--force` to overwrite.

The generated analyzer config includes default path exclusions for fixtures, tests, `dist`, declaration files, and `scripts/`, plus default warning and error complexity thresholds that you can tune in `.direc/config.json`.

It also seeds a small set of architecture boundary rules for the built-in Direc CLI and OpenSpec adapter layers.

`direc analyze` consumes OpenSpec change events and persists analyzer snapshots under `.direc/latest/` and `.direc/history/`.

```bash
direc analyze
direc analyze --change direc-facet-detection-and-tool-backed-analysis
direc analyze --watch
```

`direc analyze` now prints the saved JSON report paths and a short findings summary in the terminal. For deeper inspection, open the files in `.direc/latest/`.

## Local development in the monorepo

```bash
npm install
npm run dev:direc -- --help
npm run dev:direc -- init
npm run dev:direc -- analyze --watch
```

## Publish checklist

1. Confirm the npm package name you want is available.
2. Update `author`, description, and repository metadata in `package.json`.
3. Log in with `npm login`.
4. Publish from the monorepo root with `npm publish --workspace=direc --access public`.

## Project structure

```text
bin/
  direc.js
src/
  commands/
  lib/
  cli.ts
  main.ts
test/
  cli.test.ts
```
