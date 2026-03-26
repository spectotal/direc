## 1. Package scaffolding

- [x] 1.1 Create `packages/plugins/direc-viz/` directory with `package.json` (name: `direc-viz`, main/exports, deps: `direc-analysis-runtime` type-only)
- [x] 1.2 Add `tsconfig.json` for the new package (extend root tsconfig, include `src/**`)
- [x] 1.3 Add `packages/plugins/direc-viz` to `pnpm-workspace.yaml`
- [x] 1.4 Add `direc-viz` as a dependency in `packages/cli/direc/package.json`

## 2. Data readers

- [x] 2.1 Implement `src/reader/config-reader.ts` — parse `.direc/config.json` into typed `DirecConfig` (roles, boundary rules, analyzer thresholds)
- [x] 2.2 Implement `src/reader/snapshot-reader.ts` — read `.direc/latest/{analyzerId}.json`, return typed `AnalyzerSnapshot | null` per analyzer id; handle missing files gracefully
- [x] 2.3 Implement `src/reader/history-reader.ts` — walk `.direc/history/**/*.json`, reduce to `HistoryPoint[]`, sort ascending, cap at 200

## 3. Render model

- [x] 3.1 Define `VizModel` and supporting types in `src/model/viz-model.ts` (`RoleNode`, `DependencyEdge`, `Violation`, `FileMetric`, `HistoryPoint`)
- [x] 3.2 Implement `src/model/builder.ts` — `buildVizModel(config, driftSnapshot, complexitySnapshot, history): VizModel`; handle null snapshots with empty arrays

## 4. HTML render

- [x] 4.1 Implement `src/render/template.ts` — HTML shell string with CDN `<script>` tags (vis-network, Chart.js), three panel layout (architecture diagram, complexity heatmap, timeline), and historical point selector dropdown
- [x] 4.2 Implement architecture diagram panel JS in the template — vis-network graph, role nodes coloured by violation count, solid/dashed edges for allowed/violated boundaries, collapsed "Unassigned" group node
- [x] 4.3 Implement complexity heatmap panel JS in the template — file-tree table with maintainability colour scale, hover tooltips (cyclomatic, SLOC), warning/error threshold borders
- [x] 4.4 Implement progress timeline panel JS in the template — Chart.js line chart with `violations`, `cycles`, `avgComplexity` series; hidden when history is empty
- [x] 4.5 Implement historical point selector JS in the template — dropdown populated from `history`, updates diagram and heatmap on change
- [x] 4.6 Implement `src/render/serialise.ts` — inject `VizModel` as `window.__DIREC_DATA__ = <JSON>` into the template; return final HTML string

## 5. Public API

- [x] 5.1 Implement `src/index.ts` — export `generateViz(root: string, outPath: string): Promise<void>`; orchestrate readers → builder → serialise → write file; handle missing config (throw) and missing snapshots (warn + continue)

## 6. CLI command

- [x] 6.1 Create `packages/cli/direc/src/commands/viz.ts` — implement `runViz({ out, open }: VizOptions)`: resolve `.direc/` root (walk up), call `generateViz`, print absolute output path, optionally open in browser
- [x] 6.2 Register `viz` command in `packages/cli/direc/src/cli.ts` with `--out <path>` option (default `./direc-viz.html`) and `--open` flag

## 7. Build & smoke test

- [x] 7.1 Run `pnpm install` to link the new package
- [x] 7.2 Build `direc-viz` package (`tsc`)
- [x] 7.3 Build `direc` CLI package
- [x] 7.4 Run `direc viz --out /tmp/direc-viz.html` against the repo's own `.direc/` and verify the HTML file is produced with no errors
