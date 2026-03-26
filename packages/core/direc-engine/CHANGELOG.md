# @spectotal/direc-engine

## 0.3.0

### Minor Changes

- Add repo-local agent integrations for Codex, Claude Code, and Antigravity, including scaffolded `/direc-bound` command surfaces and skills.

  Introduce `direc viz` for generating a shareable HTML architecture report from `.direc` snapshots and history.

  Extract shared architecture-drift logic into a dedicated core package and migrate the JavaScript architecture drift plugin to the new TypeScript-based graph pipeline.

### Patch Changes

- Updated dependencies
  - @spectotal/direc-plugin-js-architecture-drift@0.3.0

## 0.2.0

### Minor Changes

- 36359a9: Rename all packages to `@spectotal/*` scope and migrate from npm to pnpm workspaces.

### Patch Changes

- Updated dependencies [36359a9]
  - @spectotal/direc-workflow-runtime@0.2.0
  - @spectotal/direc-analysis-runtime@0.2.0
  - @spectotal/direc-automation-runtime@0.2.0
  - @spectotal/direc-facet-detect@0.2.0
  - @spectotal/direc-adapter-direc@0.2.0
  - @spectotal/direc-adapter-openspec@0.2.0
  - @spectotal/direc-plugin-js-complexity@0.2.0
  - @spectotal/direc-plugin-js-architecture-drift@0.2.0
