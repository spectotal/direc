## Context

`direc` stores all analysis results in `.direc/latest/` and `.direc/history/` as structured JSON snapshots. Engineers currently have no way to visualise this data — they must read raw JSON or parse CLI output. The architecture drift config (module roles, boundary rules) lives in `.direc/config.json`. Both the current state and historical trends are available but unexploited for visual communication.

The viz feature is purely a read-and-render step: it consumes existing data and produces a single HTML file. No new analysis logic is needed.

## Goals / Non-Goals

**Goals:**

- Read `.direc/config.json`, `.direc/latest/`, and `.direc/history/` without triggering any analysis
- Produce a single self-contained CDN-linked HTML file
- Show three views: architecture diagram (bounded contexts), complexity heatmap (per-file), progress timeline (history)
- Support a shared historical point selector that updates all three views
- Add `direc viz [--out <path>] [--open]` to the CLI

**Non-Goals:**

- No bundled JS/CSS (CDN only for this iteration)
- No live-reload / server mode
- No new file formats — reads only what `direc analyze` already writes
- No filtering, search, or editing from the HTML page

## Decisions

### 1. New package `packages/plugins/direc-viz`

**Decision:** Separate package, not inlined into the CLI.

**Rationale:** Keeps rendering logic independently testable and publishable. The CLI package stays thin (command wiring only). Follows the existing plugin pattern used by `js-complexity` and `js-architecture-drift`.

**Alternative considered:** Inline in CLI — rejected because it would bloat the CLI package and mix concerns.

---

### 2. Data access: read `.direc/` files directly, no runtime import

**Decision:** The viz package reads `.direc/latest/*.json` and walks `.direc/history/**/*.json` using the filesystem, typed against the `AnalyzerSnapshot` shape from `direc-analysis-runtime`.

**Rationale:** Avoids importing analysis engines (heavy deps). The viz package only needs the data types, not the analysis runtime. It can import `direc-analysis-runtime` as a type-only dep or inline the minimal types.

**Alternative considered:** Import and re-run analysis — rejected because `viz` should be a reporting step decoupled from analysis.

---

### 3. HTML rendering: string template with embedded JSON data blob

**Decision:** A TypeScript string template produces the full HTML. All data is serialised as `window.__DIREC_DATA__ = {...}` in a `<script>` tag. Diagram/chart rendering runs in-browser via CDN libs.

**Rationale:** No bundler, no build pipeline for the HTML. The entire output is one file. The template is readable TypeScript — no JSX, no separate HTML file to sync.

**CDN libs chosen:**

- **vis-network** — force-directed graph, well-suited for module dependency diagrams with grouped nodes
- **Chart.js** — simple line charts for the timeline
- Plain DOM manipulation for the heatmap (coloured table cells)

**Alternative considered:** D3.js for all three — rejected because vis-network handles graph layout better out of the box, and D3 would require more in-template code.

---

### 4. History representation: flat sorted array of `HistoryPoint`

**Decision:** History is reduced to `{ timestamp, changeId, metrics: { violations, cycles, avgComplexity } }[]` sorted ascending by timestamp.

**Rationale:** The timeline chart only needs summary metrics per point. The per-file detail for each snapshot is too large to embed fully; historical per-file data is available on demand in the raw JSON files.

**Alternative considered:** Embedding full snapshots — rejected to keep HTML file size manageable.

---

### 5. CLI command: add to existing CLI, no new binary

**Decision:** `viz` is a new Commander subcommand in `packages/cli/direc/src/cli.ts`, implemented in `src/commands/viz.ts`.

**Rationale:** Consistent with how `analyze`, `automate`, and `doctor` are structured. Reuses the existing `resolveConfigRoot` utility for finding `.direc/`.

## Risks / Trade-offs

- **CDN dependency** → If the user is offline, the HTML will render without charts/diagram. Mitigation: print a note in the generated HTML if CDN libs fail to load. Future iteration can bundle.
- **Large history dirs** → Walking all history files on a repo with thousands of snapshots could be slow. Mitigation: cap history read at 200 most-recent entries (configurable via `--history-limit`).
- **Snapshot schema drift** → If snapshot shapes change in future, the reader may break silently. Mitigation: use optional chaining throughout the reader; log warnings for unexpected shapes.
- **No tests in first iteration** → HTML output is hard to unit test. Mitigation: keep the builder and reader logic pure (input → output) so they can be tested with fixture data in a follow-up.

## Migration Plan

1. Add `packages/plugins/direc-viz/` with `package.json`, `tsconfig.json`, source
2. Add to `pnpm-workspace.yaml`
3. Add as dependency in `packages/cli/direc/package.json`
4. Add `viz` command to `packages/cli/direc/src/cli.ts`
5. Build and smoke-test: `direc viz --out /tmp/test.html && open /tmp/test.html`

No migration needed for existing `.direc/` data — the format is unchanged.

## Open Questions

- Should `direc viz` automatically run `direc analyze` first if `.direc/latest/` is empty? (Decision deferred — for now, print a helpful error and exit.)
- History limit: default 200 entries — is this the right number? (Tunable at runtime; revisit after user feedback.)
