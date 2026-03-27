## Purpose

Define how Direc turns repository-wide file state into a source artifact for whole-repo analysis.

## Requirements

### Requirement: Repository source emits a curated repository analysis scope

The `repository` source SHALL emit one repository-wide source artifact that represents the current analysis scope for the repository.

#### Scenario: Repository paths become `source.repository.scope`

- **GIVEN** a `repository` source
- **WHEN** the source runs
- **THEN** it SHALL emit one `source.repository.scope` artifact
- **AND** the artifact scope SHALL contain the repository paths that are in scope for whole-repo analysis
- **AND** downstream extractors SHALL be able to treat that scope as the authoritative repository input

### Requirement: Repository source owns repository-scope curation

The `repository` source SHALL decide which repository files participate in whole-repo analysis before any facet-specific extractor filtering happens.

#### Scenario: Repository source excludes paths outside the intended analysis surface

- **GIVEN** a repository that contains both analysis-relevant files and files that should not shape whole-repo analysis
- **WHEN** the repository source builds its scope
- **THEN** it SHALL omit paths outside the intended analysis surface
- **AND** extractors SHALL operate within that curated source scope rather than widening it again

### Requirement: Repository source supports polling watch mode

The `repository` source SHALL support watch mode for repository-wide analysis.

#### Scenario: Included path changes trigger rerun

- **GIVEN** a watchable `repository` source
- **WHEN** the repository analysis scope changes in a way that could affect downstream analysis
- **THEN** the source SHALL trigger its change callback once for the new repository signature

#### Scenario: Out-of-scope changes do not retrigger repository analysis

- **GIVEN** a watchable `repository` source
- **WHEN** only out-of-scope repository files change between polling intervals
- **THEN** the source SHALL not trigger its change callback
