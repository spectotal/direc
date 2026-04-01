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
4. If `errorCount` is `0`, finalize the work.
5. If `errorCount` is greater than `0`, refactor the failing files and rerun the check.
6. If reducing complexity would require adding more than 3 new files within the same folder, create a semantic subfolder to group the extracted code.
7. Retry up to 3 times before stopping and providing a blocker summary.
