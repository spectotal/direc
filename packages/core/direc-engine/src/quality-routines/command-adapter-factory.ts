import type {
  BaseCommandAdapterDefinition,
  ExecutionParser,
  QualityRoutineDetector,
} from "./command-adapter-types.js";
import type {
  QualityRoutineAdapter,
  QualityRoutineExecutionResult,
  QualityRoutineParseResult,
} from "./types.js";

export function createCommandAdapter(
  definition: BaseCommandAdapterDefinition,
  detect: QualityRoutineDetector,
): QualityRoutineAdapter {
  return {
    id: definition.id,
    displayName: definition.displayName,
    supportedFacets: [...definition.supportedFacets],
    supportsScopedPaths: definition.supportsScopedPaths ?? true,
    defaultTargetPath: definition.defaultTargetPath ?? ".",
    detect,
    parseRunResult(options) {
      return parseExecution(definition.runParser, options.repositoryRoot, options.execution);
    },
    parseReport: createReportParser(definition),
  };
}

function parseExecution(
  parser: ExecutionParser,
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
): QualityRoutineParseResult {
  if (parser.kind === "result") {
    return parser.parse(repositoryRoot, execution);
  }

  const findings = parser.parse(repositoryRoot, execution);

  return {
    findings,
    metrics: {
      exitCode: execution.exitCode,
      findingCount: findings.length,
    },
    rawOutput: {
      stdout: execution.stdout,
      stderr: execution.stderr,
    },
  };
}

function createReportParser(
  definition: BaseCommandAdapterDefinition,
): QualityRoutineAdapter["parseReport"] {
  const parser = definition.runParser;

  if (!definition.parseReportFromExecution || parser.kind !== "result") {
    return undefined;
  }

  return (options) => parser.parse(options.repositoryRoot, createReportExecution(options.contents));
}

function createReportExecution(contents: string): QualityRoutineExecutionResult {
  return {
    exitCode: 0,
    stdout: contents,
    stderr: "",
    timedOut: false,
    targetPaths: [],
    scopedToEventPaths: false,
  };
}
