import type { AnalyzerFinding, QualityRoutineConfig } from "direc-analysis-runtime";
import type {
  QualityRoutineDetectionContext,
  QualityRoutineExecutionResult,
  QualityRoutineParseResult,
} from "./types.js";

export type ResultParser = (
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
) => QualityRoutineParseResult;

export type FindingParser = (
  repositoryRoot: string,
  execution: QualityRoutineExecutionResult,
) => AnalyzerFinding[];

export type ExecutionParser =
  | {
      kind: "result";
      parse: ResultParser;
    }
  | {
      kind: "findings";
      parse: FindingParser;
    };

export type BaseCommandAdapterDefinition = {
  id: string;
  displayName: string;
  supportedFacets: readonly string[];
  supportsScopedPaths?: boolean;
  defaultTargetPath?: string;
  command: {
    command: string;
    args: readonly string[];
  };
  runParser: ExecutionParser;
  parseReportFromExecution?: boolean;
};

export type NodeCommandAdapterDefinition = BaseCommandAdapterDefinition & {
  dependency: string;
  configFiles: readonly string[];
};

export type PythonCommandAdapterDefinition = BaseCommandAdapterDefinition & {
  tool: string;
};

export type TestRunnerDefinition = {
  id: string;
  displayName: string;
  supportedFacets: readonly string[];
  command: {
    command: string;
    args: readonly string[];
  };
};

export type NodeToolDetectionDefinition = {
  dependency: string;
  configFiles: readonly string[];
  command: {
    command: string;
    args: readonly string[];
  };
  id: string;
};

export type PythonToolDetectionDefinition = {
  tool: string;
  command: {
    command: string;
    args: readonly string[];
  };
  id: string;
};

export type QualityRoutineDetector =
  | ((context: QualityRoutineDetectionContext) => QualityRoutineConfig | null)
  | ((context: QualityRoutineDetectionContext) => Promise<QualityRoutineConfig | null>);
