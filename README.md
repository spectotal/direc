# direc

Direc is a pipeline-driven architecture workspace for agentic development.

This branch is a clean-break rewrite built around three explicit concerns:

- `source`: where change signals come from
- `analysis`: `facet` and `agnostic` tools that produce typed artifacts from those signals
- `feedback`: rules and sinks that turn analysis artifacts into notices and verdicts

The runtime is composed by a generic pipeline manager. Sources emit seed artifacts, facet tools consume only `source.*` artifacts to produce reusable analysis artifacts, agnostic tools build only on prior analysis artifacts, feedback rules derive `feedback.notice` and `feedback.verdict`, and sinks deliver the result to humans or agents.

## Workspace Layout

Direc keeps its generated workspace under `.direc/`.

- `.direc/config.json`: explicit editable pipeline config created by `direc init`
- `.direc/runs/<runId>/manifest.json`: immutable historical manifest with full artifact data inline
- `.direc/latest/<pipelineId>/manifest.json`: latest manifest snapshot for direct access
- `.direc/skills/<provider>/<skillId>/`: rendered provider skill bundles created by `direc init`
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
It also bootstraps provider skill bundles for the selected agent providers and installs them when an install target is available.

`direc run` executes one pipeline or all configured pipelines.

`direc watch` subscribes to source changes and re-runs the selected pipelines.

## Built-in v1 Surface

- Sources: `repository`, `git-diff`, `openspec`
- Facet tools: `js-complexity`, `graph-maker`, `spec-documents`
- Agnostic tools: `cluster-builder`, `bounds-evaluator`, `spec-conflict`
- Feedback sink: `console`

## Skills Bootstrap

`direc init` is also the first-run bootstrap for repo-local skills.

- In interactive terminals it prompts for one or more providers: `codex`, `claude`, `antigravity`
- It writes the selected provider bundle/install state into `.direc/config.json`
- It renders provider bundles under `.direc/skills/<provider>/`
- The bundled template currently managed by Direc is `chat-complexity-gate`
- Codex defaults to installing generated skills into `.codex/skills`
- Claude and Antigravity render bundle-only by default unless an explicit install target is provided

The generic pipeline core also supports command-backed analysis nodes through the same two-bucket contract used by in-process tools.
