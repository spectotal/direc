# Chat Complexity Gate

Do not finish while `js-complexity` is blocking. Reduce complexity in the current scope, preserve behavior, and rerun the required Direc check before concluding.

When implementing code in this repository:

1. Complete the requested implementation work first.
2. Before finalizing, run `direc run diff-quality`.
3. Inspect `.direc/latest/diff-quality/manifest.json` for the latest `metric.complexity` artifact.
4. If `errorCount` is `0`, you may finalize.
5. If `errorCount` is greater than `0`, refactor the failing files and rerun the check.
6. Retry up to 3 times before stopping with a blocker summary.
