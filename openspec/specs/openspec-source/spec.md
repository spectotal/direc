## Purpose

Define how Direc derives task-completion and spec-change source artifacts from an OpenSpec workspace.

## Requirements

### Requirement: Tasks mode emits one artifact per completed task

The `openspec` source SHALL emit task artifacts from checked items in `openspec/changes/*/tasks.md`.

#### Scenario: Completed tasks become `source.openspec.task`

- **GIVEN** an `openspec` source with `mode: tasks`
- **WHEN** a change task list contains checked tasks
- **THEN** the source SHALL emit one `source.openspec.task` artifact per checked task
- **AND** each artifact scope SHALL include `kind: task`, `changeId`, `taskId`, and current working-tree paths
- **AND** each payload SHALL include the task title and the task file path

### Requirement: Spec-change mode pairs delta specs with stable specs

The `openspec` source SHALL emit spec-change artifacts for change specs under `openspec/changes/<change>/specs/`.

#### Scenario: Change spec maps to stable spec path

- **GIVEN** an `openspec` source with `mode: spec-change`
- **WHEN** a change contains `openspec/changes/<change>/specs/**/spec.md`
- **THEN** the source SHALL emit `source.openspec.spec-change`
- **AND** the payload SHALL include the change spec path and the corresponding stable spec path under `openspec/specs/**/spec.md`
- **AND** the artifact scope SHALL include both paths

### Requirement: OpenSpec source supports change filtering and watch mode

The `openspec` source SHALL support limiting work to a single change and rerunning when referenced files change.

#### Scenario: `changeFilter` limits emitted artifacts

- **GIVEN** an `openspec` source with `changeFilter` configured
- **WHEN** the source runs
- **THEN** it SHALL ignore tasks and specs outside the selected change id

#### Scenario: Referenced path changes trigger rerun

- **GIVEN** a watchable `openspec` source
- **WHEN** watched task or spec paths change between polling intervals
- **THEN** the source SHALL trigger its change callback once for the new file signature
