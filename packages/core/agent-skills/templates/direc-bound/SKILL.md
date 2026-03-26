---
name: direc-bound-architecture
description: Synchronize or bootstrap repo-local `direc` architectural boundaries in `.direc/config.json` using the architecture analyzer that supports the repository's detected facets. Use when there are many unassigned modules or restrictive rules causing false positives.
license: MIT
compatibility: Requires `direc` CLI to be functional.
metadata:
  version: "1.2"
---

Generate or refine the architecture roles and rules in `.direc/config.json` by analyzing the current codebase structure and the latest supported architecture-drift snapshot.

**Context**:
The `direc` architecture is defined in `.direc/config.json` through `moduleRoles` (mapping paths to roles) and `roleBoundaryRules` (defining allowed dependencies between roles). Repository layout depends on the platform, so do not assume a structure such as `packages/`, `src/`, or a manifest like `package.json`. Resolve support through detected facets and the enabled architecture analyzer for that facet.

**Steps**

1. **Resolve Analyzer Support**
   - Inspect detected facets and enabled analyzers in `.direc/config.json`.
   - Identify the architecture drift analyzer that understands the repository's primary implementation facet or platform.
   - If no enabled architecture analyzer supports the detected platform, stop and tell the user Direc does not currently support boundary bootstrapping for this platform and they should open a GitHub issue on https://github.com/spectotal/direc.

2. **Generate and Validate the Latest Architecture Snapshot**
   - Run `npx direc analyze` or the smallest local equivalent that executes the resolved architecture analyzer.
   - Read the analyzer's latest architecture drift snapshot (for example `js-architecture-drift.json`).
   - Load the dependency graph from `snapshot.metadata.graph`. Treat it as an adjacency map: `{ "<module-path>": ["<dep-module-path>", ...] }`.
   - If `snapshot.metadata.graph` is missing, empty, or not a module-to-dependency map, stop and tell the user this analyzer does not currently emit the graph data required for graph-first boundary bootstrapping.
   - Use the snapshot's metrics, findings, and `metadata.graph` as the primary source of truth.
   - If the snapshot is already clean (`findings.length === 0`, `unassignedModuleCount === 0`, and `boundaryViolationCount === 0`) **and the config already has a non-empty `moduleRoles`**, prefer a no-op: preserve the existing role model unless the user explicitly asked to repartition the architecture.
   - If `moduleRoles` is empty or absent, do **not** treat a clean snapshot as a reason to skip bootstrapping — a clean result with no roles simply means no constraints are enforced. Proceed to step 3 to cluster the graph and generate initial roles and rules.

3. **Cluster the Graph into Roles**
   - Start from the modules and edges in `snapshot.metadata.graph`, not from the folder tree. Paths are only used after clustering to describe `match` globs.
   - Extract modules from the graph keys and treat each adjacency-list entry as an observed dependency edge.
   - Form candidate clusters by testing stable path prefixes against the graph, then score them by cohesion: good clusters keep most edges internal and have a small, interpretable set of outgoing cross-cluster edges.
   - Compare each deeper split with its parent. Keep the deeper split only when it materially improves cohesion; otherwise merge back to the parent role.
   - Reject oversplit clusters such as one-off files, tiny groups, or layout-only folders. In particular, do not create a role when the candidate has fewer than 3 files, has more cross-cluster edges than internal edges, or is merely a container such as `src`, `lib`, `internal`, `commands`, `graph`, or `validation` unless the graph clearly justifies the split.
   - Do not turn every subfolder into a role. A subfolder becomes a role only when the graph proves it is a better architectural cluster than its parent.
   - Name each role with a short kebab-case label derived from the chosen cluster path (for example `core-analysis-runtime`, `plugin-js-complexity`).
   - The correct `moduleRoles` schema is `{ "role": "<name>", "match": ["<glob>/**"] }` — the field is `match`, not `paths`.

4. **Cluster Unassigned or Unmodeled Areas**
   - Identify all `unassigned-module` findings when the analyzer emits them.
   - If the analyzer does not report `unassigned-module` until some roles already exist, bootstrap initial roles from the graph-driven clusters from step 3.
   - Propose the smallest clear set of `moduleRoles` that covers every graph-backed cluster.
   - When the existing config already cleanly covers the graph, preserve those roles instead of churning the partitioning.

5. **Synthesize Rules from Cross-Cluster Edges**
   - Derive `roleBoundaryRules` from the graph itself, not from manifests or folder adjacency.
   - Collect every edge where the source module and target module belong to different clusters. These observed cross-cluster edges are the candidate allowed dependencies.
   - For each source cluster, the distinct valid target clusters it reaches become its `onlyDependOnRoles`.
   - Also review any `forbidden-role-dependency` findings. Use them as a signal to inspect whether the edge is valid or should remain drift.
   - If a dependency is invalid, surprising, or architecturally suspect, leave it as drift instead of widening the boundary.
   - The correct `roleBoundaryRules` schema is `{ "sourceRole": "<name>", "onlyDependOnRoles": [...] }` — the field is `sourceRole`, not `role`.
   - Do not add a rule for leaf roles with no outgoing cross-cluster edges. An empty `onlyDependOnRoles` array is a config error, so omit the rule entirely.

6. **Apply and Verify**
   - Update `.direc/config.json` only when the graph-backed clustering or rules are meaningfully better than the current config, or when changes are required to resolve real drift.
   - Run the resolved architecture analyzer again.
   - Verify that false positives decrease and that the remaining findings look like real architectural drift.
   - If the snapshot was already clean, the existing role model was non-empty, and no graph-backed improvement was necessary, report that no config change was made.

**Output**

Summarize the configuration refinement:

- Analyzer and facet used.
- Whether this was an initial bootstrap (no prior role model) or a sync of an existing one.
- Whether the snapshot was already clean and the existing role model was preserved (only applicable when roles were already defined).
- List of new `moduleRoles` added.
- List of roles updated with new allowed dependencies.
- Count of resolved false positives.
- Summary of any remaining high-fidelity architectural drifts.
