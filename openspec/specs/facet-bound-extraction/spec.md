## Purpose

Define the facet-dependent extraction tools that turn source artifacts into reusable analysis artifacts.

## Requirements

### Requirement: JavaScript extraction is facet-bound and source-driven

The JavaScript extraction stack SHALL consume source artifacts and emit normalized analysis artifacts for later stages.

#### Scenario: Repository, diff, or task scope drives JS extractors

- **GIVEN** `source.repository.scope`, `source.diff.scope`, or `source.openspec.task` artifacts in a repository with the `js` facet
- **WHEN** the staged analysis pipeline runs its extractor stage
- **THEN** the `js-complexity` extractor SHALL emit `metric.complexity`
- **AND** the `graph-maker` extractor SHALL emit `structural.graph`
- **AND** both extractors SHALL be treated as facet-bound tools that require the `js` facet
- **AND** when the source provides an explicit scope, both extractors SHALL stay within that source-owned scope rather than widening back to all detected project files

### Requirement: OpenSpec spec extraction is facet-bound and isolated from generic evaluation

OpenSpec change-spec loading SHALL be a separate extractor step before generic conflict evaluation.

#### Scenario: OpenSpec spec-change source drives spec document extraction

- **GIVEN** `source.openspec.spec-change` artifacts in a repository with the `openspec` facet
- **WHEN** the staged analysis pipeline runs its extractor stage
- **THEN** the `spec-documents` extractor SHALL emit `analysis.spec-document-pair`
- **AND** it SHALL normalize stable and change spec text before passing artifacts to later stages
- **AND** it SHALL remain facet-bound rather than embedding conflict logic directly in the extractor
