# ADR 0001: Pipeline-Driven Clean Break

## Status

Accepted.

## Context

The previous Direc implementation mixed workflow events, analysis persistence, and automation handoff concerns in one runtime path. That produced a useful snapshot store, but it made it difficult to reason about feedback as a first-class concern and it blurred the package boundaries around workflow-specific behavior.

## Decision

Direc is rewritten around four runtime concepts:

1. `source`: emits seed artifacts such as `source.diff.scope`, `source.openspec.task`, and `source.openspec.spec-change`
2. `analysis`: runs as `facet` and `agnostic` buckets; facet tools may consume only `source.*`, while agnostic tools operate only on prior analysis artifacts
3. `feedback`: selects sink subscriptions and delivers already-produced analysis artifacts as persisted sink bundles
4. `pipeline-manager`: resolves the configured source, analysis nodes, and sinks into a concrete DAG execution

The rewrite keeps `.direc/` as the workspace directory, but the internal layout changes to run manifests, persisted artifact payloads, latest run pointers, and optional caches.

## Consequences

- The public config is a clean break from the previous `workflow` and `automation` model.
- Built-in tools and command-backed tools now share the same two-bucket analysis-node contract.
- Artifact type ids remain the planner-level contracts; the runtime does not add a separate contract-family taxonomy.
- Sources no longer talk directly to sinks; sink delivery is driven by subscribed analysis artifacts.
- The CLI collapses runtime entrypoints into `init`, `run`, and `watch`.
