## Purpose

Define the vendor-independent Direc analysis runtime, including normalized workflow-event execution, analyzer resolution, third-party tool integration, and persisted snapshot behavior.

## Requirements

### Requirement: Runtime executes eligible analyzers for normalized vendor-independent workflow events

Direc SHALL normalize workflow activity into a vendor-independent event schema that preserves repository root context and any known scope hints, and the analysis runtime SHALL accept that normalized event, repository context, and resolved analyzer plugins as the unit of execution.

#### Scenario: Scoped workflow event drives analyzer execution

- **WHEN** a workflow adapter emits a normalized transition event with change-relative paths for a repository with the `js` facet
- **THEN** the runtime executes every eligible JavaScript analyzer against the same repository context and scoped event payload

### Requirement: Analyzer resolution is driven by detected facets and explicit prerequisites

The runtime SHALL enable an analyzer only when the analyzer's declared facet support matches the repository's detected facet set and the analyzer's prerequisites are satisfied, and it SHALL record why configured analyzers were not enabled.

#### Scenario: Only matching analyzers are enabled

- **WHEN** the repository exposes `js` and `css` facets and the configured analyzers support `js`, `tailwind`, and Python
- **THEN** only the analyzers whose declarations match the detected facets are enabled for execution

#### Scenario: Disabled analyzer reason is persisted

- **WHEN** a configured analyzer requires the `tailwind` facet but the repository does not expose that facet
- **THEN** analyzer resolution records that the analyzer was skipped because its required facet set was not satisfied

### Requirement: Analyzer execution wraps third-party tooling and surfaces prerequisite failures

Direc analyzer plugins MUST invoke established third-party analysis tools and MUST transform tool-specific output into Direc's normalized result schema before persistence or reporting, and analyzer execution SHALL report missing tool prerequisites as actionable failures rather than silent skips or uncaught process errors.

#### Scenario: Complexity plugin normalizes third-party output

- **WHEN** the JavaScript and TypeScript complexity plugin receives raw metrics from its configured external tool
- **THEN** it emits normalized findings and metrics that conform to the shared Direc analyzer result contract

#### Scenario: Required binary is unavailable

- **WHEN** an enabled analyzer starts and its required external binary is not available in the local environment
- **THEN** Direc records the analyzer run as a prerequisite failure with setup guidance and continues evaluating other analyzers

### Requirement: Runtime persists normalized analyzer snapshots

The analysis runtime SHALL write normalized analyzer output to `.direc/latest/` and append event-linked historical snapshots to `.direc/history/` so later runs can compare current findings against prior results.

#### Scenario: Analyzer output is persisted after execution

- **WHEN** an analyzer completes successfully for a normalized event
- **THEN** the runtime writes the analyzer's latest normalized snapshot and an event-linked historical record under `.direc/`
