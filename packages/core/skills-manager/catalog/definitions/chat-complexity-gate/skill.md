---
id: chat-complexity-gate
description: Guide chat-driven implementation through a final Direc complexity gate and self-repair loop.
---

# Chat Complexity Gate

{{> complexity-loop-guardrails}}

When implementing code in this repository:

1. Complete the requested implementation work first.
2. Before finalizing, run `direc run diff-quality`.
3. Inspect `.direc/latest/diff-quality/deliveries/agent-feedback.json` for the latest `evaluation.complexity-findings` artifact.
4. If `errorFiles` is empty, finalize the work.
5. If `errorFiles` is not empty, refactor the listed files and rerun the check.
6. If reducing complexity would require adding more than 3 new files within the same folder, create a semantic subfolder to group the extracted code.
7. Treat warnings and skipped files as informative unless they become part of the current request.
8. Retry up to 3 times before stopping and providing a blocker summary.
