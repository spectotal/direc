---
id: chat-complexity-gate
description: Guide chat-driven implementation through a final Direc complexity gate and self-repair loop.
---

# Chat Complexity Gate

{{> complexity-loop-guardrails}}

When implementing code in this repository:

1. Complete the requested implementation work first.
2. Before finalizing, run `direc run diff-quality`.
3. Inspect `.direc/latest/diff-quality/manifest.json` for the latest `metric.complexity` artifact.
4. If `errorCount` is `0`, you may finalize.
5. If `errorCount` is greater than `0`, refactor the failing files and rerun the check.
6. Retry up to 3 times before stopping with a blocker summary.
