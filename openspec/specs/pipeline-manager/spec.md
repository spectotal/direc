## Purpose

Define how Direc composes sources, staged analysis nodes, feedback rules, and sinks into persisted pipeline runs.

## Requirements

### Requirement: Pipeline manager executes pipelines in fixed stage order

The system SHALL execute pipelines as source, then extractors, then derivers, then evaluators, then feedback.

#### Scenario: Eligible staged pipeline run

- **GIVEN** an enabled pipeline with a detected source, staged analysis tools, a feedback rule, and a sink
- **WHEN** the pipeline manager runs that pipeline
- **THEN** it SHALL run the source first and persist its seed artifacts
- **AND** it SHALL run extractors before derivers, derivers before evaluators, and feedback after evaluators
- **AND** it SHALL topologically order tools only within each analysis stage by produced and required artifact types
- **AND** it SHALL deliver only subscribed feedback artifact types to each sink

### Requirement: Pipeline manager validates staged analysis contracts

The system SHALL reject pipelines that violate the extractor or agnostic-stage rules.

#### Scenario: Invalid stage contract is rejected

- **GIVEN** a configured analysis tool with the wrong stage or binding
- **WHEN** the pipeline is planned
- **THEN** the pipeline manager SHALL reject facet-bound tools with no `requiredFacets`
- **AND** it SHALL reject agnostic tools that declare `requiredFacets`
- **AND** it SHALL reject derivers or evaluators that require `source.*`
- **AND** it SHALL reject tools whose required artifact types cannot be produced by the source or an earlier stage in the same pipeline

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
