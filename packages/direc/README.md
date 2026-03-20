# direc

`direc` is a spec-driven development CLI. The package is publishable as `direc`, so users can invoke it with `npx direc` or install it globally with `npm install -g direc`.

## What is included

- TypeScript CLI source with a `bin` entrypoint
- `init`, `run`, and `doctor` starter commands
- Build scripts for local development and npm publishing
- A generated `direc.config.json` and example spec template

## Install

```bash
npx direc --help
npm install -g direc
direc --help
```

## Commands

```bash
direc init
direc doctor
direc run specs/example.spec.md --dry-run
```

## Local development in the monorepo

```bash
npm install
npm run dev:direc -- --help
npm run dev:direc -- init
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
