## Purpose

Define how Direc turns repository-wide file state into a source artifact for whole-repo analysis.

## Requirements

### Requirement: Repository source emits filtered repository scope

The `repository` source SHALL emit one repository-wide scope artifact after applying source-level exclusions.

#### Scenario: Repository paths become `source.repository.scope`

- **GIVEN** a `repository` source
- **WHEN** the source runs
- **THEN** it SHALL emit one `source.repository.scope` artifact
- **AND** the artifact scope SHALL include filtered absolute repository paths
- **AND** the payload SHALL include both the filtered paths and the configured `excludePaths`

### Requirement: Repository source exclusions are source-owned

The `repository` source SHALL filter excluded paths before any extractor-specific facet filtering.

#### Scenario: Source-level exclusions remove tests, fixtures, and generated output

- **GIVEN** a `repository` source with configured `excludePaths`
- **WHEN** matching files exist under excluded paths or names
- **THEN** those files SHALL not appear in `source.repository.scope`
- **AND** operational directories such as `.git`, `node_modules`, `dist`, `.direc`, and `coverage` SHALL remain excluded regardless of config

### Requirement: Repository source supports polling watch mode

The `repository` source SHALL rerun when the filtered repository path set or file mtimes change.

#### Scenario: Included path changes trigger rerun

- **GIVEN** a watchable `repository` source
- **WHEN** a non-excluded repository file is added or modified between polling intervals
- **THEN** the source SHALL trigger its change callback once for the new filtered repository signature

#### Scenario: Excluded path changes do not trigger rerun

- **GIVEN** a watchable `repository` source
- **WHEN** only excluded files change between polling intervals
- **THEN** the source SHALL not trigger its change callback
