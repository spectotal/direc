# @spectotal/direc-plugin-js-architecture-drift

JavaScript and TypeScript architecture drift analyzer plugin for Direc.

## Overview

This plugin analyzes JavaScript and TypeScript projects to identify architectural drift, specifically:

- **Circular Dependencies**: Detects cycles in the module dependency graph.
- **Role Boundary Violations**: Validates that modules adhere to defined roles and can only depend on allowed module roles.
- **Unassigned Modules**: Identifies source files that do not match any defined architectural role.

## How it Works

The plugin uses the TypeScript Compiler API (`typescript`) to:

1.  **Crawl Files**: Identify all relevant source files based on the analysis scope.
2.  **Extract Dependencies**: Perform a lightweight pre-processing of each file to extract imports and resolve them within the project structure.
3.  **Build Graph**: Construct a directed graph representing the project's internal module dependencies.
4.  **Analyze**: Run cycle detection algorithms and validate each edge against the configured `moduleRoles` and `roleBoundaryRules`.

## Installation

This plugin is part of the Spectotal Direc analysis suite. It is typically configured in `.direc/config.json`.

## Debugging Analysis

If you need to understand how the plugin is parsing a specific file or why a dependency is being resolved in a certain way, you can use the built-in live debug tool.

### Live Debugging

Run the live test script while specifying the `DEBUG_FILE` environment variable:

```bash
cd packages/plugins/js-architecture-drift
DEBUG_FILE=src/index.ts npx tsx --test test/live.test.ts
```

This will produce a detailed report including:

- **TS Pre-process info**: Raw imports extracted from the file.
- **Module Resolution**: Where each import was resolved on disk.
- **Resulting Graph**: The final graph entry for that file.

This tool is invaluable for troubleshooting resolution issues or verifying that your `tsConfigPath` and `packageBoundaries` are correctly configured.
