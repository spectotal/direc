## Purpose

Define how workflow adapters and automation dispatch interact for both native DIREC snapshot events and OpenSpec workflow events.

## Requirements

### Requirement: DIREC snapshot events can trigger automation

The native `direc` workflow adapter SHALL support automation, and Direc automation configuration SHALL allow snapshot events to trigger subagent dispatch when `snapshotEvents` is enabled.

#### Scenario: DIREC snapshot dispatches automation

- **WHEN** `direc automate` runs with workflow `direc` and the working tree snapshot changes
- **THEN** Direc runs analyzers for that snapshot and writes a subagent request and result under `.direc/automation/`

### Requirement: Automation reuses analyzer summaries for all analyzer types

Automation dispatch SHALL build its subagent request from the analyzer summary produced by the analysis runtime, including built-in analyzers and synthetic quality-routine analyzers.

#### Scenario: Quality routine findings appear in the subagent request

- **WHEN** a configured `routine:eslint` analyzer emits findings for a workflow event
- **THEN** those findings contribute to the persisted analyzer summary that is sent to the subagent backend
