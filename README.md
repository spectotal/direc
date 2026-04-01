# direc

Direc is a pipeline-driven architecture workspace for agentic development.

This branch is a clean-break rewrite built around three explicit concerns:

- `source`: where change signals come from
- `analysis`: `facet` and `agnostic` tools that produce typed artifacts from those signals
- `feedback`: sink delivery that serializes selected analysis artifacts for humans or agents

The runtime is composed by a generic pipeline manager. Sources emit seed artifacts, facet tools consume only `source.*` artifacts to produce reusable analysis artifacts, agnostic tools build only on prior analysis artifacts, and sinks serialize selected analysis artifacts for humans or agents.

## Workspace Layout

Direc keeps its generated workspace under `.direc/`.

- `.direc/config.json`: explicit editable pipeline config created by `direc init`
- `.direc/runs/<runId>/manifest.json`: immutable historical manifest with full artifact data inline
- `.direc/latest/<pipelineId>/manifest.json`: latest manifest snapshot for direct access
- `.direc/runs/<runId>/deliveries/<sinkId>.json`: serialized sink delivery for that run
- `.direc/latest/<pipelineId>/deliveries/<sinkId>.json`: latest serialized sink delivery per pipeline
- `.direc/cache/`: optional runtime caches

## Commands

```bash
pnpm install
pnpm run build
pnpm --filter direc exec node ./bin/direc.js init
pnpm --filter direc exec node ./bin/direc.js run
pnpm --filter direc exec node ./bin/direc.js watch
```

`direc init` detects local facets and materializes explicit sources, tools, sinks, and two-bucket pipelines into `.direc/config.json`.
It also deploys all bundled skills directly into the native skill folders for the selected agents.

`direc run` executes one pipeline or all configured pipelines.

`direc watch` subscribes to source changes and re-runs the selected pipelines.

## Built-in v1 Surface

- Sources: `repository`, `git-diff`, `openspec`
- Facet tools: `js-complexity`, `graph-maker`, `spec-documents`
- Agnostic tools: `cluster-builder`, `bounds-evaluator`, `complexity-findings`, `spec-conflict`
- Feedback sinks: `console`, `agent-feedback`

## Skills Bootstrap

`direc init` is also the first-run bootstrap for bundled repo-local skills.

- In interactive terminals it shows a multiselect for agents: `codex`, `claude`, `antigravity`
- It writes the selected agent list into `.direc/config.json`
- It renders bundled `skill.md` definitions into final `SKILL.md`
- It deploys every bundled skill directly into `.codex/skills`, `.claude/skills`, and `.agent/skills` for the selected agents
- The bundled skill currently managed by Direc is `chat-complexity-gate`

The generic pipeline core also supports command-backed analysis nodes through the same two-bucket contract used by in-process tools.
