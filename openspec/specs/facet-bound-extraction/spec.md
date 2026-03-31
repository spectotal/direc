## Purpose

Define the facet-dependent analysis tools that turn source artifacts into reusable analysis artifacts.

## Requirements

### Requirement: JavaScript facet analysis is source-driven

The JavaScript facet stack SHALL consume only source artifacts and emit normalized analysis artifacts for later agnostic analysis.

#### Scenario: Repository, diff, or task scope drives JS facet tools

- **GIVEN** `source.repository.scope`, `source.diff.scope`, or `source.openspec.task` artifacts in a repository with the `js` facet
- **WHEN** the analysis pipeline runs its `facet` bucket
- **THEN** the `js-complexity` facet tool SHALL emit `metric.complexity`
- **AND** the `graph-maker` facet tool SHALL emit `structural.graph`
- **AND** both tools SHALL require the `js` facet
- **AND** both tools SHALL consume only the source-owned scope rather than widening back to all detected project files

### Requirement: OpenSpec spec loading is a facet step before agnostic comparison

OpenSpec change-spec loading SHALL be a separate facet step before agnostic conflict analysis.

#### Scenario: OpenSpec spec-change source drives spec document loading

- **GIVEN** `source.openspec.spec-change` artifacts in a repository with the `openspec` facet
- **WHEN** the analysis pipeline runs its `facet` bucket
- **THEN** the `spec-documents` facet tool SHALL emit `analysis.spec-document-pair`
- **AND** it SHALL normalize stable and change spec text before passing artifacts to later stages
- **AND** it SHALL remain a facet tool rather than embedding conflict logic directly in the source or agnostic tool
