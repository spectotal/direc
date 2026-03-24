## Purpose

Define how the OpenSpec adapter turns OpenSpec status and filesystem signals into normalized Direc analysis events.

## Requirements

### Requirement: OpenSpec adapter emits normalized events without OpenSpec internals

The OpenSpec analysis adapter SHALL derive change state by invoking OpenSpec CLI status output and filesystem watches, and it SHALL emit Direc normalized events without importing or depending on OpenSpec internal modules.

#### Scenario: Adapter emits transition events from OpenSpec status changes

- **WHEN** the adapter detects that an OpenSpec artifact changed from `ready` to `done`
- **THEN** it emits a Direc normalized transition event that preserves the change name, artifact id, and output path

### Requirement: OpenSpec adapter supports scoped and global watching

The OpenSpec analysis adapter SHALL support watching a single named change or all active OpenSpec changes in the repository.

#### Scenario: Single change watch filters unrelated activity

- **WHEN** the adapter is started with a specific change filter
- **THEN** it emits events only for that change and ignores transitions from other active changes
