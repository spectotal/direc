import type { QualityRoutineAdapter } from "./types.js";
import { createPythonCommandAdapter, createPythonTestRunnerAdapter } from "./command-adapters.js";
import {
  parseBlackOutput,
  parseMypyOutput,
  parseRuffFormatOutput,
  parseRuffOutput,
} from "./python-parsers.js";

const pythonCommandAdapters = [
  {
    id: "ruff",
    displayName: "Ruff",
    supportedFacets: ["python"],
    tool: "ruff",
    command: {
      command: "python",
      args: ["-m", "ruff", "check", "--output-format", "json"],
    },
    runParser: {
      kind: "result" as const,
      parse: parseRuffOutput,
    },
  },
  {
    id: "ruff-format",
    displayName: "Ruff Format",
    supportedFacets: ["python"],
    tool: "ruff-format",
    command: {
      command: "python",
      args: ["-m", "ruff", "format", "--check"],
    },
    runParser: {
      kind: "result" as const,
      parse: parseRuffFormatOutput,
    },
  },
  {
    id: "black",
    displayName: "Black",
    supportedFacets: ["python"],
    tool: "black",
    command: {
      command: "python",
      args: ["-m", "black", "--check", "--diff"],
    },
    runParser: {
      kind: "result" as const,
      parse: parseBlackOutput,
    },
  },
  {
    id: "mypy",
    displayName: "Mypy",
    supportedFacets: ["python"],
    tool: "mypy",
    command: {
      command: "python",
      args: ["-m", "mypy", "--show-error-codes"],
    },
    runParser: {
      kind: "result" as const,
      parse: parseMypyOutput,
    },
  },
] as const;

const pythonTestRunnerAdapters = [
  {
    id: "pytest",
    displayName: "Pytest",
    supportedFacets: ["python"],
    command: {
      command: "python",
      args: ["-m", "pytest", "-q"],
    },
  },
] as const;

export function getPythonQualityAdapters(): QualityRoutineAdapter[] {
  return [
    ...pythonCommandAdapters.map(createPythonCommandAdapter),
    ...pythonTestRunnerAdapters.map(createPythonTestRunnerAdapter),
  ];
}
