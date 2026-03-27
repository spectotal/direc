## Purpose

Define how Direc turns analysis outputs into feedback artifacts and delivers them through sinks.

## Requirements

### Requirement: Threshold feedback derives notice and verdict artifacts

The built-in threshold rule SHALL aggregate selected analysis outputs into `feedback.notice` and `feedback.verdict`.

#### Scenario: Analysis outputs produce feedback artifacts

- **GIVEN** selected analysis artifacts of type `metric.complexity`, `evaluation.bounds-distance`, or `evaluation.spec-conflict`
- **WHEN** the threshold feedback rule runs
- **THEN** it SHALL emit one `feedback.notice` artifact with severity `info`, `warning`, or `error` based on aggregated counts
- **AND** it SHALL emit one `feedback.verdict` artifact with verdict `block` when `errorCount > 0` and `blockOnError` is not disabled
- **AND** it SHALL emit verdict `proceed` when no blocking errors are present

### Requirement: Console sink delivers feedback artifacts to standard output

The built-in `console` sink SHALL render subscribed feedback artifacts as plain-text output.

#### Scenario: Notice and verdict artifacts are delivered

- **GIVEN** `feedback.notice` and `feedback.verdict` artifacts
- **WHEN** the `console` sink delivers them
- **THEN** it SHALL print notices as `[notice:<severity>] <summary>`
- **AND** it SHALL print verdicts as `[verdict:<verdict>] <summary>`
- **AND** it SHALL ignore artifact types outside its subscribed feedback types
