## Purpose

Define how Direc turns Git working-tree state or a named diff into source artifacts for analysis.

## Requirements

### Requirement: Git working-tree mode emits a diff scope artifact

The `git-diff` source SHALL emit the current working-tree file scope when no `diffSpec` is configured.

#### Scenario: Working tree paths become `source.diff.scope`

- **GIVEN** a `git-diff` source without a configured `diffSpec`
- **WHEN** the source runs
- **THEN** it SHALL inspect `git status --porcelain --untracked-files=all`
- **AND** it SHALL emit one `source.diff.scope` artifact whose scoped paths are the resulting absolute repository paths
- **AND** renamed entries SHALL use the destination path

### Requirement: Named diff mode emits a diff scope artifact

The `git-diff` source SHALL support evaluating a specific diff range or revision reference.

#### Scenario: `diffSpec` selects the compared paths

- **GIVEN** a `git-diff` source with `diffSpec` configured
- **WHEN** the source runs
- **THEN** it SHALL inspect `git diff --name-only --diff-filter=ACMR <diffSpec>`
- **AND** it SHALL emit one `source.diff.scope` artifact whose scoped paths are the resulting absolute repository paths

### Requirement: Git diff source supports polling watch mode

The `git-diff` source SHALL support continuous monitoring by polling for path-set changes.

#### Scenario: Path-set change triggers rerun

- **GIVEN** a watchable `git-diff` source
- **WHEN** the watched path set changes between polling intervals
- **THEN** the source SHALL trigger its change callback once for the new path signature
