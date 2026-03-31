## Purpose

Define the CLI surface that bootstraps Direc configuration and runs two-bucket analysis pipelines.

## Requirements

### Requirement: `direc init` materializes two-bucket workspace configuration from detected context

The CLI SHALL detect repository context and write a concrete two-bucket pipeline configuration to `.direc/config.json`.

#### Scenario: Repository facets bootstrap built-in analysis config

- **GIVEN** a repository with detectable facets or source signals
- **WHEN** `direc init` runs
- **THEN** it SHALL detect facets from repository evidence and detect whether Git and OpenSpec are present
- **AND** it SHALL write `.direc/config.json` with explicit `sources`, `tools`, `sinks`, and `pipelines`
- **AND** each pipeline SHALL declare `analysis.facet`, `analysis.agnostic`, `feedback.rules`, and `feedback.sinks`
- **AND** JavaScript repositories SHALL enable the `facet` and `agnostic` architecture stack
- **AND** JavaScript repositories SHALL enable the `repository` source and the `repository-quality` pipeline for whole-repo analysis
- **AND** repositories with OpenSpec SHALL enable the spec document facet tool and spec conflict agnostic pipeline
- **AND** repositories with Git SHALL enable the `diff` source and `diff-quality` pipeline

### Requirement: `direc run` executes one or more configured pipelines

The CLI SHALL execute the selected pipeline or all configured pipelines from the current workspace.

#### Scenario: Run selected pipeline

- **GIVEN** a valid `.direc/config.json`
- **WHEN** `direc run <pipeline-id>` runs
- **THEN** it SHALL execute only the selected pipeline
- **AND** it SHALL print artifact, notice, and verdict counts for that pipeline

#### Scenario: Run all configured pipelines

- **GIVEN** a valid `.direc/config.json`
- **WHEN** `direc run` runs without a pipeline id
- **THEN** it SHALL execute every configured pipeline in declaration order

### Requirement: `direc watch` watches one or more configured pipelines

The CLI SHALL provide a long-running watch mode on top of the pipeline manager.

#### Scenario: Watch selected or all pipelines

- **GIVEN** a valid `.direc/config.json`
- **WHEN** `direc watch` starts with or without a pipeline id
- **THEN** it SHALL watch the selected pipeline or all configured pipelines
- **AND** it SHALL print a summary after each pipeline run
- **AND** it SHALL remain active until interrupted
