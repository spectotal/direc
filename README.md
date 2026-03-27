# direc

Direc is a pipeline-driven architecture workspace for agentic development.

This branch is a clean-break rewrite built around three explicit concerns:

- `source`: where change signals come from
- `analysis`: tools that produce typed artifacts from those signals
- `feedback`: rules and sinks that turn analysis artifacts into notices and verdicts

The runtime is composed by a generic pipeline manager. Sources emit seed artifacts, analysis tools build a directed artifact graph, feedback rules derive `feedback.notice` and `feedback.verdict` artifacts, and sinks deliver the result to humans or agents.

## Workspace Layout

Direc keeps its generated workspace under `.direc/`.

- `.direc/config.json`: explicit editable pipeline config created by `direc init`
- `.direc/runs/<runId>/manifest.json`: run manifest
- `.direc/runs/<runId>/artifacts/*.json`: persisted artifact payloads
- `.direc/latest/<pipelineId>.json`: latest successful run pointer
- `.direc/cache/`: optional runtime caches

## Commands

```bash
pnpm install
pnpm run build
pnpm --filter direc exec node ./bin/direc.js init
pnpm --filter direc exec node ./bin/direc.js run
pnpm --filter direc exec node ./bin/direc.js watch
```

`direc init` detects local facets and materializes explicit sources, tools, sinks, and pipelines into `.direc/config.json`.

`direc run` executes one pipeline or all configured pipelines.

`direc watch` subscribes to source changes and re-runs the selected pipelines.

## Built-in v1 Surface

- Sources: `git-diff`, `openspec`
- Analysis tools: `complexity`, `graph-maker`, `cluster-builder`, `bounds-evaluator`, `spec-conflict`
- Feedback sink: `console`

The generic pipeline core also supports command-backed analysis nodes through the same contract used by in-process tools.
