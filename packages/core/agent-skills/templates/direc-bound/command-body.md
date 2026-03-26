Use this file when the user runs `/direc-bound` to synchronize repo-local architectural boundaries with the current codebase state.

1. Resolve whether the repository's detected facets have a supported architecture drift analyzer.
2. If no supported architecture analyzer is enabled for the repo's platform, stop and tell the user Direc does not currently support this platform for boundary bootstrapping and they should open a GitHub issue.
3. Produce the latest architecture drift snapshot with the local Direc workflow:
   ```bash
   npx direc analyze
   ```
4. Follow the `direc-bound-architecture` skill instructions to cluster roles, refine `.direc/config.json`, and verify the result.
5. Summarize the analyzer used, the boundary updates, and any remaining true drifts.
