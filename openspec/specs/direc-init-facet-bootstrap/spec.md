## Purpose

Define how `direc init` detects repository facets, resolves supported analyzers, and bootstraps `.direc/config.json` with useful defaults.

## Requirements

### Requirement: Init bootstraps Direc configuration from detected facets

`direc init` SHALL detect repository facets, resolve the analyzers supported by the current installation, and write a `.direc/config.json` file that enables the matching analyzer set and includes default thresholds, severity bands, non-production exclusions, seeded architecture boundary-rule slots, and default automation settings.

#### Scenario: Supported repository produces config

- **WHEN** `direc init` runs in a repository whose detected facets map to installed supported analyzers
- **THEN** it writes `.direc/config.json` with the detected facets and enabled analyzer configuration

#### Scenario: Generated config includes analyzer tuning

- **WHEN** `direc init` resolves the JavaScript and TypeScript analyzer set for a repository
- **THEN** `.direc/config.json` includes default complexity thresholds and exclude patterns plus default architecture exclude patterns and boundary rule slots

#### Scenario: Generated config includes quality routines

- **WHEN** `direc init` detects repository-native lint, format, typecheck, or test tooling
- **THEN** `.direc/config.json` includes `qualityRoutines` entries for those tools and enables the corresponding `routine:<name>` analyzers

#### Scenario: Generated config uses taxonomy-aware boundary rules

- **WHEN** `direc init` writes `.direc/config.json`
- **THEN** the architecture drift configuration contains boundary rules for `packages/cli/direc/src/lib`, `packages/adapters/openspec/src/status.ts`, and `packages/adapters/openspec/src/events.ts`

### Requirement: Init fails clearly when no supported analyzer set can be resolved

`direc init` SHALL fail with actionable guidance when a repository has no supported analyzer set instead of writing a misleading empty configuration.

#### Scenario: Unsupported repository does not receive empty config

- **WHEN** `direc init` detects only unsupported facets or no compatible analyzers are installed
- **THEN** the command exits with guidance describing the missing support or prerequisites and does not write an unusable `.direc/config.json`

### Requirement: Init preserves desired analyzers even when prerequisites are currently missing

`direc init` SHALL persist the selected analyzer and quality-routine configuration as the desired state even when the local environment is temporarily missing a tool prerequisite, and it SHALL surface that prerequisite issue during doctor or analysis resolution instead of disabling the config entry.

#### Scenario: Missing local binary does not disable a selected routine

- **WHEN** `direc init` detects a `typescript` quality routine from repository signals but `npm exec tsc` is not currently available
- **THEN** it still writes the `routine:typescript` config as enabled and reports the missing prerequisite separately

### Requirement: Init respects existing Direc configuration

`direc init` SHALL not silently overwrite existing `.direc/config.json` or legacy Direc configuration without an explicit overwrite path.

#### Scenario: Existing config blocks accidental overwrite

- **WHEN** the repository already contains Direc configuration and `direc init` is run without a force option
- **THEN** the command preserves the existing configuration and reports that an explicit overwrite or migration step is required
