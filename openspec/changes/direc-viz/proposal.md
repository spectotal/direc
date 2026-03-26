## Why

Engineers working with `direc` have no visual way to understand the bounded architecture of their project — roles, boundaries, violations, and complexity trends are buried in JSON files. The `direc viz` command produces a self-contained HTML report from existing `.direc/` data, making architecture health immediately visible and shareable.

## What Changes

- New package `packages/plugins/direc-viz` that reads `.direc/` data and renders a single HTML file
- New `viz` CLI command added to the `direc` binary
- No changes to analysis, persistence, or existing commands — viz is a pure reporting step

## Capabilities

### New Capabilities

- `viz-generator`: Reads config, latest snapshots, and history from `.direc/`; assembles a typed render model; writes a self-contained CDN-linked HTML file with three interactive panels: architecture diagram, complexity heatmap, and progress timeline
- `viz-cli-command`: Adds `direc viz [--out <path>] [--open]` to the CLI — resolves `.direc/` root, invokes the generator, prints the output path, optionally opens in browser

### Modified Capabilities

<!-- none -->

## Impact

- New package: `packages/plugins/direc-viz` (added to pnpm workspace, added as dep to CLI package)
- Modified: `packages/cli/direc/src/cli.ts` — new `viz` command registered
- New file added: `packages/cli/direc/src/commands/viz.ts`
- Runtime deps: none (HTML uses CDN-linked vis-network, Chart.js, D3)
- Dev deps: none beyond existing TypeScript setup
