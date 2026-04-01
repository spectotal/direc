## Purpose

Define how Direc serializes selected analysis artifacts and delivers them through sinks.

## Requirements

### Requirement: Sink delivery serializes subscribed analysis artifacts

The runtime SHALL serialize subscribed analysis artifacts into per-sink delivery files.

#### Scenario: Selected analysis artifacts are written for sink delivery

- **GIVEN** a sink subscribed to one or more analysis artifact types
- **WHEN** a pipeline run reaches sink delivery
- **THEN** the runtime SHALL write `.direc/runs/<runId>/deliveries/<sinkId>.json`
- **AND** it SHALL mirror the same serialized bundle to `.direc/latest/<pipelineId>/deliveries/<sinkId>.json`
- **AND** the serialized bundle SHALL contain `runId`, `pipelineId`, `sinkId`, and `artifacts`

### Requirement: Console sink renders actionable analysis artifacts to standard output

The built-in `console` sink SHALL render subscribed analysis artifacts as plain-text output.

#### Scenario: Complexity findings are delivered to the console

- **GIVEN** an `evaluation.complexity-findings` artifact with warning, error, or skipped files
- **WHEN** the `console` sink delivers them
- **THEN** it SHALL print one line per relevant file
- **AND** it SHALL label warning and error findings distinctly
- **AND** it SHALL ignore artifact types outside its subscribed analysis types
