## Purpose

Define the built-in analysis tools that turn source artifacts into metrics, structure, and evaluation artifacts.

## Requirements

### Requirement: Complexity analysis is scope-aware and thresholded

The `complexity` tool SHALL derive `metric.complexity` from JavaScript and TypeScript files selected by source artifacts.

#### Scenario: Diff or task scope limits analyzed files

- **GIVEN** `source.diff.scope` or `source.openspec.task` artifacts
- **WHEN** the `complexity` tool runs
- **THEN** it SHALL analyze only scoped JavaScript or TypeScript paths when they are available
- **AND** it SHALL fall back to the repository source-file list when no scoped JS paths are present
- **AND** it SHALL emit `metric.complexity` with per-file cyclomatic estimates, configured thresholds, `warningCount`, `errorCount`, and `maxCyclomatic`

### Requirement: Structural analysis derives graph, clusters, roles, boundaries, and bounds distance

The built-in structural analysis stack SHALL derive higher-order artifacts from scoped JavaScript and TypeScript files.

#### Scenario: Structural pipeline runs on scoped code

- **GIVEN** source artifacts that resolve to JavaScript or TypeScript paths
- **WHEN** `graph-maker`, `cluster-builder`, and `bounds-evaluator` run
- **THEN** `graph-maker` SHALL emit `structural.graph` from relative imports and `require` calls between scoped files
- **AND** `cluster-builder` SHALL emit `structural.cluster`, `structural.roles`, and `structural.boundaries` by grouping files under `packages/<group>/<name>` or their top-level directory
- **AND** `bounds-evaluator` SHALL emit `evaluation.bounds-distance` that combines complexity counts with detected cross-cluster dependency edges

### Requirement: Spec-conflict analysis compares stable and change specs

The `spec-conflict` tool SHALL report semantic drift between a change spec and the current stable spec text.

#### Scenario: Normalized spec text differs

- **GIVEN** `source.openspec.spec-change` artifacts
- **WHEN** the `spec-conflict` tool runs and a stable spec exists
- **THEN** it SHALL normalize both files by trimming blank and whitespace-only differences before comparing them
- **AND** it SHALL emit `evaluation.spec-conflict` with `comparedCount`, `conflictCount`, and conflict entries for changed specs
- **AND** it SHALL skip missing stable specs instead of treating them as conflicts
