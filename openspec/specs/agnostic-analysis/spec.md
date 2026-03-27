## Purpose

Define the platform-agnostic derivation and evaluation tools that consume prior analysis artifacts.

## Requirements

### Requirement: Agnostic derivation consumes extractor outputs only

Platform-agnostic derivers SHALL consume prior analysis artifacts, not source artifacts.

#### Scenario: Graph-derived architecture model

- **GIVEN** `structural.graph` artifacts from an earlier extractor stage
- **WHEN** the staged analysis pipeline runs its deriver stage
- **THEN** the `cluster-builder` deriver SHALL emit `structural.cluster`, `structural.roles`, and `structural.boundaries`
- **AND** it SHALL not require `source.*` artifacts directly

### Requirement: Agnostic evaluators consume extracted or derived artifacts only

Platform-agnostic evaluators SHALL consume previously produced analysis artifacts and emit evaluation artifacts for feedback.

#### Scenario: Boundary distance evaluation

- **GIVEN** `structural.graph`, `structural.boundaries`, and optional `metric.complexity` artifacts
- **WHEN** the evaluator stage runs
- **THEN** the `bounds-evaluator` SHALL emit `evaluation.bounds-distance`
- **AND** it SHALL remain platform-agnostic

#### Scenario: Spec conflict evaluation

- **GIVEN** `analysis.spec-document-pair` artifacts from the OpenSpec extractor stage
- **WHEN** the evaluator stage runs
- **THEN** the `spec-conflict` evaluator SHALL emit `evaluation.spec-conflict`
- **AND** it SHALL not read change or stable spec files directly
