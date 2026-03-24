# `direc-plugin-js-complexity`

JavaScript / TypeScript complexity analysis for Direc, with a standalone API you can use in any js related project.

It parses source with `@typescript-eslint/typescript-estree` and reports:

- `cyclomatic`
- `logicalSloc`
- `maintainability`

The metric output is intentionally aligned with the older escomplex-style shape used by Direc:

```json
{
  "path": "src/index.ts",
  "cyclomatic": 4,
  "logicalSloc": 6,
  "maintainability": 134.271
}
```

## Install

```bash
npm install direc-plugin-js-complexity
```

Requirements:

- Node.js `>=18.18`

## Standalone Usage

You do not need the Direc runtime to use the metric engine.

### Analyze a Source String

Use `analyzeSource` when you already have file contents in memory:

```ts
import { analyzeSource } from "direc-plugin-js-complexity";

const source = `
export function score(value) {
  if (value > 10) {
    return value * 2;
  }

  return value;
}
`;

const metrics = analyzeSource(source, "/absolute/path/to/src/index.ts");

console.log(metrics);
```

Example output:

```json
{
  "cyclomatic": 3,
  "logicalSloc": 4,
  "maintainability": 143.971
}
```

### Analyze a Set of Files

Use `runComplexityTool` when you want this package to read and analyze files for you:

```ts
import { runComplexityTool } from "direc-plugin-js-complexity";

const repositoryRoot = process.cwd();

const result = await runComplexityTool({
  repositoryRoot,
  sourcePaths: ["src/index.ts", "src/server.ts", "packages/app/src/main.tsx"],
});

console.log(result.metrics);
console.log(result.skippedFiles);
```

Return shape:

```ts
type ComplexityMetric = {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
};

type ComplexityAnalysisError = {
  path: string;
  message: string;
};

type ComplexityRunnerResult = {
  metrics: ComplexityMetric[];
  skippedFiles: ComplexityAnalysisError[];
};
```

`sourcePaths` must be relative to `repositoryRoot`.

### File Discovery

This package does not do repository globbing for you. Pair it with your own file discovery layer.

Example with `fast-glob`:

```ts
import fg from "fast-glob";
import { runComplexityTool } from "direc-plugin-js-complexity";

const repositoryRoot = process.cwd();

const sourcePaths = await fg(["**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}"], {
  cwd: repositoryRoot,
  ignore: ["**/node_modules/**", "**/dist/**", "**/test/fixtures/**"],
  onlyFiles: true,
});

const result = await runComplexityTool({
  repositoryRoot,
  sourcePaths,
});

console.log(JSON.stringify(result, null, 2));
```

## Parsing Notes

- Supported source extensions: `.js`, `.cjs`, `.mjs`, `.jsx`, `.ts`, `.cts`, `.mts`, `.tsx`
- Type-only syntax such as interfaces, type aliases, `import type`, and annotations is ignored for executable complexity metrics
- Empty or type-only files produce `cyclomatic: 1`, `logicalSloc: 0`, `maintainability: 171`
- Files that fail parsing are reported in `skippedFiles`; the whole run does not fail

## Metric Definitions

This package reports file-level aggregate metrics.

That means the numbers are not "just the top-level module" and not "just one function". The file result combines:

- a module baseline
- any functions / arrow functions found in the file
- decision points and logical branches inside those functions

### `cyclomatic`

`cyclomatic` is the aggregate branch / path count for the file.

This implementation starts at `1` for the file itself, then increments for:

- each `function`, `function expression`, and valid arrow function
- each `if`
- each ternary / `ConditionalExpression`
- each `for`, `for...in`, `for...of`, `while`, and `do...while`
- each `catch`
- each `switch` case with a `test` value
- each logical short-circuit / coalescing operator: `&&`, `||`, `??`

Notes:

- type-only syntax does not affect cyclomatic complexity
- imports / exports do not affect cyclomatic complexity
- a simple file with one function and two `if` statements has `4`
  `1` for the file, `1` for the function, `2` for the `if` statements

### `logicalSloc`

`logicalSloc` is AST-based logical source lines of code, not physical line count.

It counts logical statements / declarations rather than newline characters. Representative increments include:

- `ExpressionStatement`
- `ReturnStatement`, `ThrowStatement`, `BreakStatement`, `ContinueStatement`
- `VariableDeclarator`
- `IfStatement`
  `if` contributes `1`, and `if/else` contributes `2`
- loops such as `for`, `for...in`, `for...of`, `while`
- `do...while`
  contributes `2`
- `SwitchStatement` and each `SwitchCase`
- function / class declarations
- object properties and class property definitions

Notes:

- `logicalSloc` is intentionally syntax-aware; it is not derived from counting lines in the file
- type-only syntax is excluded
- import / export wrapper nodes are excluded
- empty or type-only files produce `0`

### `maintainability`

`maintainability` is a legacy escomplex-style maintainability index derived from:

- average cyclomatic complexity
- average logical SLOC
- average Halstead effort

The package first computes Halstead operator / operand counts from the AST.

Halstead terms used here:

- `length = totalOperators + totalOperands`
- `vocabulary = distinctOperators + distinctOperands`
- `difficulty = (distinctOperators / 2) * (totalOperands / distinctOperands)`
  if `distinctOperands` is `0`, the right-hand factor falls back to `1`
- `volume = length * log2(vocabulary)`
- `effort = difficulty * volume`

The maintainability calculation then uses aggregate averages across the file:

```txt
divisor = methodCount + 1
averageCyclomatic = cyclomatic / divisor
averageEffort = halsteadEffort / divisor
averageLogicalSloc = logicalSloc / divisor

maintainability =
  171
  - 3.42 * ln(averageEffort)
  - ln(averageCyclomatic)
  - 16.2 * ln(averageLogicalSloc)
```

Notes:

- the `+ 1` in the divisor includes the module scope itself, mirroring the legacy escomplex family
- if average effort or average logical SLOC is `0` or less, maintainability is returned as `171`
- the result is capped at `171`
- the final value is rounded to `3` decimal places
- larger numbers are better

In practice:

- empty / type-only files return `171`
- complex files with more branching, more logical statements, and more Halstead effort score lower

## Direc Plugin Usage

If you are using Direc, use the plugin factory:

```ts
import { createJsComplexityPlugin } from "direc-plugin-js-complexity";

const plugin = createJsComplexityPlugin();
```

Default Direc thresholds:

- warning threshold: `20`
- error threshold: `35`
- regression delta: `5`

## Public API

```ts
import {
  analyzeSource,
  createJsComplexityPlugin,
  defaultPrerequisiteCheck,
  parseSource,
  runComplexityTool,
} from "direc-plugin-js-complexity";
```

Use `parseSource` only if you specifically need the raw TSESTree AST. Most consumers should use `analyzeSource` or `runComplexityTool`.
