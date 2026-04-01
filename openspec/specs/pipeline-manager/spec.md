## Purpose

Define how Direc composes sources, `facet` and `agnostic` analysis nodes, and sinks into persisted pipeline runs.

## Requirements

### Requirement: Pipeline manager executes pipelines in fixed analysis order

The system SHALL execute pipelines as source, then `facet`, then `agnostic`, then sink delivery.

#### Scenario: Eligible two-bucket pipeline run

- **GIVEN** an enabled pipeline with a detected source, `facet` and `agnostic` analysis tools, and a sink
- **WHEN** the pipeline manager runs that pipeline
- **THEN** it SHALL run the source first and persist its seed artifacts
- **AND** it SHALL run `facet` before `agnostic`, and sink delivery after `agnostic`
- **AND** it SHALL run `facet` tools in declaration order
- **AND** it SHALL topologically order tools only within the `agnostic` bucket by produced and required artifact types
- **AND** it SHALL deliver only subscribed artifact types to each sink

### Requirement: Pipeline manager validates analysis bucket contracts

The system SHALL reject pipelines that violate the `facet` or `agnostic` input rules.

#### Scenario: Invalid analysis contract is rejected

- **GIVEN** a configured analysis tool with the wrong bucket inputs or binding
- **WHEN** the pipeline is planned
- **THEN** the pipeline manager SHALL reject `facet` tools with no `requiredFacets`
- **AND** it SHALL reject `facet` tools that do not require at least one `source.*` artifact
- **AND** it SHALL reject `facet` tools whose required or optional inputs include any non-`source.*` artifact
- **AND** it SHALL reject agnostic tools that declare `requiredFacets`
- **AND** it SHALL reject agnostic tools whose required or optional inputs include any `source.*` artifact
- **AND** it SHALL reject `facet` tools whose required artifact types cannot be produced by the source
- **AND** it SHALL reject agnostic tools whose required artifact types cannot be produced by the source, a `facet` tool, or an earlier agnostic tool in the same pipeline

### Requirement: Pipeline manager persists run data under `.direc`

The system SHALL persist both run-scoped history and direct-access latest snapshots for every successful pipeline run.

#### Scenario: Successful run writes manifest and sink deliveries

- **GIVEN** a successful pipeline run
- **WHEN** the run finishes
- **THEN** it SHALL write `.direc/runs/<runId>/manifest.json`
- **AND** it SHALL write `.direc/latest/<pipelineId>/manifest.json`
- **AND** it SHALL write one delivery file per sink under each run and latest delivery directory
- **AND** both manifests SHALL contain full persisted artifact data inline
- **AND** each persisted artifact envelope SHALL include `id`, `type`, `producerId`, `runId`, `pipelineId`, `sourceId`, `scope`, `inputArtifactIds`, `timestamp`, and `payload`

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
