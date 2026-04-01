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
- **AND** each pipeline SHALL declare `analysis.facet`, `analysis.agnostic`, and `feedback.sinks`
- **AND** JavaScript repositories SHALL enable the `facet` and `agnostic` architecture stack
- **AND** JavaScript repositories SHALL enable the `complexity-findings` agnostic analyzer
- **AND** JavaScript repositories SHALL enable the `repository` source and the `repository-quality` pipeline for whole-repo analysis
- **AND** repositories with OpenSpec SHALL enable the spec document facet tool and spec conflict agnostic pipeline
- **AND** repositories with Git SHALL enable the `diff` source and `diff-quality` pipeline
- **AND** repositories configured with agents SHALL enable the `agent-feedback` sink on quality pipelines

### Requirement: `direc init` bootstraps agent-native bundled skill deployment

The CLI SHALL collect an explicit list of agents and deploy every bundled skill into each selected agent's native skill folder.

#### Scenario: Interactive init selects agents and bundled skills

- **GIVEN** `direc init` runs in an interactive terminal without an `--agent` flag
- **WHEN** the bootstrap prompts for skills configuration
- **THEN** it SHALL show a multiselect for one or more of `codex`, `claude`, and `antigravity`
- **AND** it SHALL write the selected agent list into `.direc/config.json`
- **AND** it SHALL deploy `SKILL.md` into each agent's native skill folder
- **AND** it SHALL deploy every bundled skill for each selected agent

#### Scenario: Non-interactive init requires explicit agent mappings

- **GIVEN** `direc init` runs without interactive terminal input
- **WHEN** no `--agent` flag is provided
- **THEN** it SHALL fail with a clear error requesting `--agent`

#### Scenario: Duplicate or invalid agent mappings are rejected

- **GIVEN** repeated `--agent` flags or configured agent entries
- **WHEN** the same agent is declared more than once
- **THEN** it SHALL fail with a clear validation error

### Requirement: `direc run` executes one or more configured pipelines

The CLI SHALL execute the selected pipeline or all configured pipelines from the current workspace.

#### Scenario: Run selected pipeline

- **GIVEN** a valid `.direc/config.json`
- **WHEN** `direc run <pipeline-id>` runs
- **THEN** it SHALL execute only the selected pipeline
- **AND** it SHALL print artifact, delivered-artifact, and blocking-artifact counts for that pipeline

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
