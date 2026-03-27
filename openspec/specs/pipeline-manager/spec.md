## Purpose

Define how Direc composes sources, analysis nodes, feedback rules, and sinks into persisted pipeline runs.

## Requirements

### Requirement: Pipeline manager executes configured pipelines as an artifact graph

The system SHALL execute a configured pipeline as source emission, then eligible analysis nodes, then feedback rules, then subscribed sinks.

#### Scenario: Eligible pipeline run

- **GIVEN** an enabled pipeline with a detected source, enabled tools, a feedback rule, and a sink
- **WHEN** the pipeline manager runs that pipeline
- **THEN** it SHALL run the source first and persist its seed artifacts
- **AND** it SHALL run only analysis nodes whose selectors are satisfied by currently available artifacts
- **AND** it SHALL topologically order analysis nodes by produced and consumed artifact types
- **AND** it SHALL reject cycles between analysis nodes instead of running them in an arbitrary order
- **AND** it SHALL evaluate feedback rules after analysis using the rule selector or default selector
- **AND** it SHALL deliver only subscribed feedback artifact types to each sink

### Requirement: Pipeline manager persists run data under `.direc`

The system SHALL persist run artifacts and latest-run pointers for every successful pipeline run.

#### Scenario: Successful run writes manifest and payloads

- **GIVEN** a successful pipeline run
- **WHEN** the run finishes
- **THEN** it SHALL write `.direc/runs/<runId>/manifest.json`
- **AND** it SHALL write artifact payload files under `.direc/runs/<runId>/artifacts/`
- **AND** it SHALL write `.direc/latest/<pipelineId>.json`
- **AND** each persisted artifact envelope SHALL include `id`, `type`, `producerId`, `runId`, `pipelineId`, `sourceId`, `scope`, `inputArtifactIds`, `timestamp`, and `payloadPath`

### Requirement: Pipeline manager supports watch-based reruns

The system SHALL support continuous execution when the configured source exposes a watch interface.

#### Scenario: Watchable source reruns on change

- **GIVEN** a pipeline whose source plugin supports watch mode
- **WHEN** watch mode starts
- **THEN** the pipeline manager SHALL execute one initial run immediately
- **AND** it SHALL queue later reruns in response to source change notifications

#### Scenario: Non-watchable source rejects watch mode

- **GIVEN** a pipeline whose source plugin does not support watch mode
- **WHEN** watch mode starts
- **THEN** the pipeline manager SHALL fail with a clear error

### Requirement: Command-backed tools use the same analysis-node contract

The system SHALL treat command-backed analysis tools as first-class analysis nodes.

#### Scenario: Command-backed tool returns artifacts

- **GIVEN** a tool configuration with `kind: command`
- **WHEN** the pipeline manager executes that tool
- **THEN** it SHALL send JSON input on stdin containing run metadata, options, and input artifacts
- **AND** it SHALL read JSON from stdout containing an `artifacts` array
- **AND** it SHALL reject non-zero exit codes, timeouts, invalid JSON, or artifact types outside the tool's declared `produces` list
