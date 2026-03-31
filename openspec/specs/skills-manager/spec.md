## Purpose

Define how Direc renders the bundled chat complexity gate skill for selected providers during workspace bootstrap.

## Requirements

### Requirement: Skills manager loads the bundled chat complexity gate template

The system SHALL load the bundled `chat-complexity-gate` markdown template from the skills-manager package.

#### Scenario: Bundled skill template is loaded

- **GIVEN** the skills-manager package is available
- **WHEN** the skills manager loads the catalog
- **THEN** it SHALL load the bundled `chat-complexity-gate` `skill.md`
- **AND** it SHALL reject the template if it has no description

### Requirement: Skills manager renders provider bundles from canonical content

The system SHALL render provider bundles for `codex`, `claude`, and `antigravity` from the bundled chat complexity gate template.

#### Scenario: Provider bundles are rendered

- **GIVEN** the bundled chat complexity gate template and one or more selected providers
- **WHEN** bundle rendering runs
- **THEN** it SHALL write rendered bundles under `.direc/skills/<provider>/chat-complexity-gate/`
- **AND** Codex bundles SHALL contain `SKILL.md`
- **AND** Claude and Antigravity bundles SHALL contain `INSTRUCTIONS.md` and `manifest.json`
- **AND** it SHALL copy any skill `resources/` into the rendered bundle

### Requirement: Skills manager supports markdown templating with partials

The system SHALL support deterministic markdown templating for the bundled chat complexity gate skill.

#### Scenario: Skill content includes variables and partials

- **GIVEN** the bundled skill template references `{{id}}`, `{{description}}`, or `{{> partial-name}}`
- **WHEN** the bundle is rendered
- **THEN** it SHALL substitute supported variables
- **AND** it SHALL inline partials from the skills-manager package bundle
- **AND** it SHALL fail clearly when a referenced partial does not exist

### Requirement: Skills manager installs bundles when a target is configured

The system SHALL install rendered bundles to provider-specific targets when the workspace config marks them as installed.

#### Scenario: Installed and bundle-only providers are mixed

- **GIVEN** a workspace config with both `installed` and `bundle-only` skill providers
- **WHEN** bundle synchronization runs
- **THEN** it SHALL copy installed bundles into each provider target path
- **AND** it SHALL leave bundle-only providers rendered only under `.direc/skills/<provider>/`
