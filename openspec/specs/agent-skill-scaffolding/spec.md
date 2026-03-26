## Purpose

Define how `direc init` scaffolds repo-local agent skills and prompts for selected agent targets.

## Requirements

### Requirement: Init scaffolds selected agent assets

`direc init` SHALL scaffold repo-local agent assets only for the selected agent targets, using the built-in `direc-bound` bundle.

#### Scenario: Explicit agent flags scaffold matching assets

- **WHEN** `direc init --agent codex --agent claude` runs successfully
- **THEN** it writes the `direc-bound` prompt or command files and the `direc-bound-architecture` skill files for Codex and Claude only

#### Scenario: Scaffolded assets expose the direc-bound entrypoint

- **WHEN** `direc init` writes repo-local agent assets
- **THEN** the scaffolded surfaces expose `/direc-bound`
- **AND** the scaffolded skill name is `direc-bound-architecture`

### Requirement: Init prompts for agent selection in interactive sessions

`direc init` SHALL prompt for agent selection when no `--agent` flags are provided and the command is running in an interactive terminal.

#### Scenario: Interactive init uses a built-in agent-selection prompt

- **WHEN** `direc init` runs without `--agent` flags and both stdin and stdout are TTYs
- **THEN** it asks the user which of `codex`, `claude`, and `antigravity` should be scaffolded

### Requirement: Non-interactive init requires explicit agent selection

`direc init` SHALL fail with guidance when no `--agent` flags are provided in a non-interactive environment.

#### Scenario: Non-interactive init rejects missing agents

- **WHEN** `direc init` runs without `--agent` flags and the session is not interactive
- **THEN** it exits with guidance telling the user to pass one or more `--agent` flags

### Requirement: Init prints guidance and does not execute direc-bound

`direc init` SHALL print next-step guidance for `/direc-bound` after scaffolding completes and SHALL not execute the command itself.

#### Scenario: Successful init prints next-step guidance

- **WHEN** `direc init` completes after scaffolding at least one agent target
- **THEN** it prints `Next step: run /direc-bound`
- **AND** it does not invoke any external agent runtime
