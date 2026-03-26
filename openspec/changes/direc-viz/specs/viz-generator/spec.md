## ADDED Requirements

### Requirement: Read config and latest snapshots

The viz generator SHALL read `.direc/config.json` and `.direc/latest/*.json` to obtain architecture roles, boundary rules, the dependency graph, role assignments, violations, and per-file complexity metrics.

#### Scenario: Config and snapshots present

- **WHEN** `.direc/config.json` and at least one file in `.direc/latest/` exist
- **THEN** the generator reads all data without error and proceeds to build the render model

#### Scenario: Config missing

- **WHEN** `.direc/config.json` does not exist
- **THEN** the generator throws a descriptive error stating the config file is missing and that `direc init` should be run first

#### Scenario: Latest snapshots missing

- **WHEN** `.direc/latest/` is empty or does not exist
- **THEN** the generator emits a warning and produces an HTML file with architecture roles only (no complexity or drift data), and a banner message advising the user to run `direc analyze` first

---

### Requirement: Read historical snapshots

The viz generator SHALL walk `.direc/history/**/*.json` and reduce each snapshot to a `HistoryPoint` containing `{ timestamp, changeId, metrics: { violations, cycles, avgComplexity } }`, sorted ascending by timestamp, capped at 200 most-recent entries by default.

#### Scenario: History available

- **WHEN** `.direc/history/` contains at least one snapshot file
- **THEN** the generator returns a non-empty sorted `HistoryPoint[]`

#### Scenario: No history available

- **WHEN** `.direc/history/` is empty or absent
- **THEN** the generator returns an empty array and the timeline panel is hidden in the HTML output

#### Scenario: History exceeds cap

- **WHEN** more than 200 snapshot files exist across all change dirs
- **THEN** only the 200 most-recent entries (by timestamp) are included

---

### Requirement: Assemble render model

The viz generator SHALL assemble a typed `VizModel` from config, latest snapshots, and history before rendering.

#### Scenario: Full data available

- **WHEN** config, latest snapshots, and history are all present
- **THEN** `VizModel` contains non-empty `roles`, `edges`, `violations`, `complexity`, and `history` arrays

#### Scenario: Partial data

- **WHEN** some snapshots are absent (e.g., only `js-complexity` is present, no `js-architecture-drift`)
- **THEN** missing sections of `VizModel` are empty arrays and corresponding HTML panels show a "no data" message

---

### Requirement: Produce self-contained CDN-linked HTML

The viz generator SHALL write a single HTML file embedding all `VizModel` data as `window.__DIREC_DATA__` and loading vis-network, Chart.js via CDN `<script>` tags.

#### Scenario: Successful write

- **WHEN** `generateViz(root, outPath)` is called with valid inputs
- **THEN** the file at `outPath` is written and contains a valid HTML5 document with `window.__DIREC_DATA__` populated

#### Scenario: Output path directory missing

- **WHEN** the directory for `outPath` does not exist
- **THEN** the generator throws a descriptive error

---

### Requirement: Architecture diagram panel

The HTML output SHALL render a force-directed graph where nodes are module roles (from config), edges represent allowed dependency relationships, and boundary violations are shown as dashed red edges.

#### Scenario: Roles with no violations

- **WHEN** no boundary violations exist in the latest snapshot
- **THEN** all edges are rendered as solid lines and no red colour is used

#### Scenario: Roles with violations

- **WHEN** boundary violations exist
- **THEN** violating edges are rendered as dashed red and the affected role nodes are coloured to indicate violation severity

#### Scenario: Unassigned modules

- **WHEN** the snapshot contains unassigned modules
- **THEN** they appear as a collapsed "Unassigned" group node in the diagram

---

### Requirement: Complexity heatmap panel

The HTML output SHALL render a file-tree heatmap where each file cell is coloured by its maintainability index (green = high, red = low) with hover tooltips showing cyclomatic complexity and SLOC.

#### Scenario: Hover tooltip

- **WHEN** the user hovers over a file cell
- **THEN** a tooltip shows the file path, maintainability score, cyclomatic complexity, and logical SLOC

#### Scenario: Threshold highlighting

- **WHEN** a file's cyclomatic complexity exceeds the warning or error threshold from config
- **THEN** that file cell is visually distinguished (warning = amber border, error = red border)

---

### Requirement: Progress timeline panel

The HTML output SHALL render a line chart with one data series per tracked metric (`violations`, `cycles`, `avgComplexity`) over time, with the X-axis showing timestamps and grouped by `changeId` where available.

#### Scenario: Multiple history points

- **WHEN** `history` contains two or more points
- **THEN** the chart renders all three metric series with visible data points and a legend

#### Scenario: Single history point

- **WHEN** `history` contains exactly one point
- **THEN** the chart renders a single-point view without trend lines

---

### Requirement: Historical point selector

The HTML output SHALL include a dropdown or slider that allows the user to select a historical snapshot point, updating the architecture diagram and complexity heatmap to reflect the selected point's data.

#### Scenario: User selects a past point

- **WHEN** the user selects a historical timestamp from the selector
- **THEN** the architecture diagram and heatmap update to reflect that snapshot's violations and per-file metrics

#### Scenario: Current point selected

- **WHEN** the user selects the most-recent (default) point
- **THEN** the diagram and heatmap show the latest snapshot data
