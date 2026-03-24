## Purpose

Define how Direc's JavaScript and TypeScript analysis plugins run third-party tooling, honor configured scope and exclusions, and normalize findings.

## Requirements

### Requirement: JavaScript and TypeScript complexity analysis is scope-aware and configurable

The JavaScript and TypeScript complexity plugin SHALL invoke its configured third-party complexity tool against the repository or changed production-oriented source scope associated with the normalized event, SHALL honor default or user-configured exclude patterns, and SHALL classify findings using configurable warning and error thresholds.

#### Scenario: Transition event scopes complexity analysis

- **WHEN** the runtime receives a normalized event that includes changed JavaScript and TypeScript paths
- **THEN** the complexity plugin limits analysis to the relevant package or file scope when the underlying tool supports scoped execution

#### Scenario: Fixture paths are excluded and severe hotspots are escalated

- **WHEN** Direc configuration excludes `test/fixtures/**` and configures separate warning and error complexity thresholds
- **THEN** the plugin skips the excluded fixture files and emits higher-severity findings only for files that exceed the stronger threshold

### Requirement: Complexity findings report thresholds and regressions

The JavaScript and TypeScript complexity plugin SHALL normalize threshold violations and metric regressions so the runtime can compare current findings against prior analyzer snapshots.

#### Scenario: Regression is reported against prior snapshot

- **WHEN** the latest complexity metrics exceed configured thresholds or regress relative to the previous stored snapshot
- **THEN** the plugin emits normalized findings that identify the affected scope and the measured regression

### Requirement: Architecture drift analysis normalizes configured structural violations

The JavaScript and TypeScript architecture drift plugin SHALL invoke a third-party dependency graph tool, SHALL read repository-specific dependency boundary rules and exclusions from Direc configuration before execution, and SHALL normalize cycles, role-boundary violations, and layer drift into the shared Direc result schema.

#### Scenario: Dependency cycle becomes a normalized finding

- **WHEN** the dependency analysis tool reports a cycle between workspace packages or source modules
- **THEN** the plugin emits a normalized architecture drift finding that identifies the offending dependency path

#### Scenario: Configured dependency constraint is enforced

- **WHEN** `.direc/config.json` declares an allowed-dependency role constraint between two package scopes
- **THEN** the plugin reports a normalized violation when the external analysis tool detects a dependency edge outside the allowed target roles or inside the forbidden target roles

#### Scenario: Fixture-only cycles are ignored by default

- **WHEN** Direc configuration excludes `test/fixtures/**` from architecture analysis
- **THEN** cycles that exist only inside excluded fixture paths are not reported as repository architecture drift findings
