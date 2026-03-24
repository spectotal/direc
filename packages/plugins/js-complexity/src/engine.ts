import type { TSESTree } from "@typescript-eslint/typescript-estree";
import type { AnalyzerPrerequisiteResult } from "direc-analysis-runtime";
import {
  analyzeSource as analyzeSourceImpl,
  runComplexityTool as runComplexityToolImpl,
} from "./internal/runtime/analysis.js";
import {
  defaultPrerequisiteCheck as defaultPrerequisiteCheckImpl,
  parseSource as parseSourceImpl,
} from "./internal/ast/parser.js";

type ParsedProgram = TSESTree.Program & {
  tokens: TSESTree.Token[];
};

export type ComplexityMetric = {
  path: string;
  cyclomatic: number;
  logicalSloc: number;
  maintainability: number;
};

export type ComplexityAnalysisError = {
  path: string;
  message: string;
};

export type ComplexityRunnerResult = {
  metrics: ComplexityMetric[];
  skippedFiles: ComplexityAnalysisError[];
};

export async function defaultPrerequisiteCheck(): Promise<AnalyzerPrerequisiteResult> {
  return defaultPrerequisiteCheckImpl();
}

export async function runComplexityTool(options: {
  repositoryRoot: string;
  sourcePaths: string[];
}): Promise<ComplexityRunnerResult> {
  return runComplexityToolImpl(options);
}

export function analyzeSource(source: string, filePath: string): Omit<ComplexityMetric, "path"> {
  return analyzeSourceImpl(source, filePath);
}

export function parseSource(source: string, filePath: string): ParsedProgram {
  return parseSourceImpl(source, filePath);
}
