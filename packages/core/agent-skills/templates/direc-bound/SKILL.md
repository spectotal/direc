---
name: direc-bound-architecture
description: Synchronize or bootstrap repo-local `direc` architectural boundaries in `.direc/config.json` using the architecture analyzer that supports the repository's detected facets. Use when there are many unassigned modules or restrictive rules causing false positives.
license: MIT
compatibility: Requires `direc` CLI to be functional.
metadata:
  version: "1.1"
---

Generate or refine the architecture roles and rules in `.direc/config.json` by analyzing the current codebase structure and the latest supported architecture-drift snapshot.

**Context**:
The `direc` architecture is defined in `.direc/config.json` through `moduleRoles` (mapping paths to roles) and `roleBoundaryRules` (defining allowed dependencies between roles). Repository layout depends on the platform, so do not assume a structure such as `packages/`, `src/`, or a manifest like `package.json`. Resolve support through detected facets and the enabled architecture analyzer for that facet.

**Steps**

1. **Resolve Analyzer Support**
   - Inspect detected facets and enabled analyzers in `.direc/config.json`.
   - Identify the architecture drift analyzer that understands the repository's primary implementation facet or platform.
   - If no enabled architecture analyzer supports the detected platform, stop and tell the user Direc does not currently support boundary bootstrapping for this platform and they should open a GitHub issue on https://github.com/spectotal/direc.

2. **Generate the Latest Architecture Snapshot**
   - Run `npx direc analyze` or the smallest local equivalent that executes the resolved architecture analyzer.
   - Read the analyzer's latest architecture drift snapshot (for example `js-architecture-drift.json`).
   - Use the snapshot's metrics, findings, and metadata graph as the primary source of truth.

3. **Infer Structural Clusters**
   - Start from analyzer-reported paths, dependency graph clusters, namespaces, packages, services, or modules.
   - Read only representative manifests, config files, or source files when you need responsibility labels for a cluster.
   - Keep the role model aligned with stable architectural units, not one-off files.

4. **Cluster Unassigned or Unmodeled Areas**
   - Identify all `unassigned-module` findings when the analyzer emits them.
   - If the analyzer does not report `unassigned-module` until some roles already exist, bootstrap initial roles from the snapshot graph and stable path clusters.
   - Propose new `moduleRoles` that cover the clusters with the smallest clear set of roles.

5. **Synthesize Missing Rules**
   - Analyze `forbidden-role-dependency` findings.
   - If a dependency is valid, add the missing role to the relevant `onlyDependOnRoles` whitelist.
   - If a dependency is invalid, leave it as drift instead of widening the boundary.

6. **Apply and Verify**
   - Update `.direc/config.json` with the proposed roles and rules.
   - Run the resolved architecture analyzer again.
   - Verify that false positives decrease and that the remaining findings look like real architectural drift.

**Output**

Summarize the configuration refinement:

- Analyzer and facet used.
- List of new `moduleRoles` added.
- List of roles updated with new allowed dependencies.
- Count of resolved false positives.
- Summary of any remaining high-fidelity architectural drifts.
