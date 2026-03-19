# direc

`direc` is a small CLI scaffold for spec-driven development workflows. The package is set up so you can publish it to npm and invoke it with `npx direc`.

## What is included

- TypeScript CLI source with a `bin` entrypoint
- `init`, `run`, and `doctor` starter commands
- Build scripts for local development and npm publishing
- A generated `direc.config.json` and example spec template

## Getting started

```bash
npm install
npm run build
npm start -- --help
```

## Local development

```bash
npm run dev -- --help
npm run dev -- init
npm run dev -- run specs/example.spec.md --dry-run
```

## Publish checklist

1. Confirm the npm package name you want is available.
2. Update `author`, `license`, repository metadata, and description in `package.json`.
3. Log in with `npm login`.
4. Publish with `npm publish --access public`.

## Command examples

```bash
npx direc init
npx direc doctor
npx direc run specs/example.spec.md --dry-run
```

## Project structure

```text
bin/
  direc.js
src/
  commands/
  lib/
  cli.ts
  main.ts
```
