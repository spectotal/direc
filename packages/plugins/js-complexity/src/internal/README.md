## Internal layout

- `ast/`: parser setup, traversal context, skip rules, and AST walking.
- `metrics/`: metric accumulation plus node-specific complexity and Halstead calculators.
- `plugin/`: plugin option normalization, finding creation, and snapshot helpers.
- `runtime/`: file loading and per-file analysis orchestration.

Public entrypoints stay in `../engine.ts` and `../index.ts`.
