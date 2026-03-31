## Purpose

Define the platform-agnostic analysis tools that consume prior analysis artifacts.

## Requirements

### Requirement: Agnostic analysis consumes prior analysis artifacts only

Platform-agnostic tools SHALL consume prior analysis artifacts, not source artifacts.

#### Scenario: Graph-derived architecture model

- **GIVEN** `structural.graph` artifacts from an earlier facet tool
- **WHEN** the analysis pipeline runs its `agnostic` bucket
- **THEN** the `cluster-builder` agnostic tool SHALL emit `structural.cluster`, `structural.roles`, and `structural.boundaries`
- **AND** it SHALL not require `source.*` artifacts directly

### Requirement: Agnostic analysis may build on facet or earlier agnostic outputs

Platform-agnostic tools SHALL consume previously produced analysis artifacts and emit follow-on analysis or evaluation artifacts for feedback.

#### Scenario: Boundary distance evaluation

- **GIVEN** `structural.graph`, `structural.boundaries`, and optional `metric.complexity` artifacts
- **WHEN** the `agnostic` bucket runs
- **THEN** the `bounds-evaluator` agnostic tool SHALL emit `evaluation.bounds-distance`
- **AND** it SHALL remain platform-agnostic

#### Scenario: Spec conflict evaluation

- **GIVEN** `analysis.spec-document-pair` artifacts from an earlier facet tool
- **WHEN** the `agnostic` bucket runs
- **THEN** the `spec-conflict` agnostic tool SHALL emit `evaluation.spec-conflict`
- **AND** it SHALL not read change or stable spec files directly
