## Purpose

Define how Direc explicitly loads extension modules that contribute analyzers, facet detectors, and quality adapters.

## Requirements

### Requirement: Extension loading is explicit and additive

Direc SHALL load extension modules only when they are explicitly listed in `.direc/config.json` or passed via CLI flags, and it SHALL merge their analyzers, facet detectors, and quality adapters with the built-in set.

#### Scenario: CLI-provided extension participates in init

- **WHEN** `direc init --extension ./direc-extension.mjs` is run in a repository
- **THEN** Direc loads that module during facet detection and analyzer registration and persists the extension source in `.direc/config.json`

### Requirement: Extension identifiers must be unique

Direc SHALL reject duplicate analyzer ids or quality adapter ids across built-ins and loaded extensions, and it SHALL fail facet detection when multiple detectors emit the same facet id.

#### Scenario: Duplicate analyzer id is rejected

- **WHEN** two loaded extension modules both export an analyzer with id `dup-analyzer`
- **THEN** Direc fails the command with an actionable duplicate-id error instead of choosing one implicitly
