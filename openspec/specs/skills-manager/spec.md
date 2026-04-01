## Purpose

Define how Direc renders bundled skill markdown and deploys all bundled skills into selected native agent folders during workspace bootstrap.

## Requirements

### Requirement: Skills manager loads bundled skill definitions from the package catalog

The system SHALL load bundled skill definitions from the skills-manager package catalog.

#### Scenario: Bundled skill definition is loaded

- **GIVEN** the skills-manager package is available
- **WHEN** the skills manager loads the catalog
- **THEN** it SHALL load bundled `skill.md` definitions from the package catalog
- **AND** it SHALL reject any bundled skill that has no description

### Requirement: Skills manager deploys all bundled skills into selected native agent folders

The system SHALL render and deploy every bundled skill for each configured agent.

#### Scenario: Bundled skills are deployed for selected agents

- **GIVEN** a workspace config with one or more configured agents
- **WHEN** skill synchronization runs
- **THEN** it SHALL render all bundled skills into final markdown
- **AND** it SHALL write only `SKILL.md` under each native agent folder
- **AND** Codex deployments SHALL be written under `.codex/skills/<skillId>/`
- **AND** Claude deployments SHALL be written under `.claude/skills/<skillId>/`
- **AND** Antigravity deployments SHALL be written under `.agent/skills/<skillId>/`
- **AND** it SHALL not create `.direc/skills/` staging bundles, manifests, or alternate filenames

### Requirement: Skills manager reconciles selected-agent deployments without removing unrelated skills

The system SHALL reconcile only bundled Direc skill ids in the native agent folders for the selected agents.

#### Scenario: Selected agents change

- **GIVEN** an agent target folder containing previously deployed Direc bundled skills and unrelated user-managed skills
- **WHEN** synchronization runs with a different selected agent list
- **THEN** it SHALL overwrite bundled Direc skills for the selected agents
- **AND** it SHALL remove bundled Direc skill folders from deselected agents
- **AND** it SHALL leave unrelated non-Direc skill folders untouched

### Requirement: Skills manager supports markdown templating with partials

The system SHALL support deterministic markdown templating for bundled skills before deployment.

#### Scenario: Skill content includes variables and partials

- **GIVEN** a bundled `skill.md` references `{{id}}`, `{{description}}`, or `{{> partial-name}}`
- **WHEN** the deployed markdown is rendered
- **THEN** it SHALL substitute supported variables
- **AND** it SHALL inline partials from the package bundle
- **AND** it SHALL fail clearly when a referenced partial does not exist
