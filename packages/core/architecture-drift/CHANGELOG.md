# @spectotal/direc-core-architecture-drift

## 0.3.0

### Minor Changes

- Add repo-local agent integrations for Codex, Claude Code, and Antigravity, including scaffolded `/direc-bound` command surfaces and skills.

  Introduce `direc viz` for generating a shareable HTML architecture report from `.direc` snapshots and history.

  Extract shared architecture-drift logic into a dedicated core package and migrate the JavaScript architecture drift plugin to the new TypeScript-based graph pipeline.
