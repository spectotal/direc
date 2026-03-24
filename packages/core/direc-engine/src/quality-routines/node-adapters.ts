import type { QualityRoutineAdapter } from "./types.js";
import { createNodeCommandAdapter, createNodeTestRunnerAdapter } from "./command-adapters.js";
import { parseEslintOutput } from "./eslint-parser.js";
import { parsePrettierOutput } from "./node-parsers.js";
import { createTypescriptAdapter } from "./typescript-adapter.js";

const nodeCommandAdapters = [
  {
    id: "eslint",
    displayName: "ESLint",
    supportedFacets: ["js"],
    dependency: "eslint",
    configFiles: ["eslint.config.js", "eslint.config.mjs", ".eslintrc"],
    command: {
      command: "npm",
      args: ["exec", "--", "eslint", "--format", "json"],
    },
    runParser: {
      kind: "result" as const,
      parse: parseEslintOutput,
    },
    parseReportFromExecution: true,
  },
  {
    id: "prettier",
    displayName: "Prettier",
    supportedFacets: ["js", "css", "frontend"],
    dependency: "prettier",
    configFiles: [".prettierrc", ".prettierrc.json", ".prettierrc.js", "prettier.config.js"],
    command: {
      command: "npm",
      args: ["exec", "--", "prettier", "--check"],
    },
    runParser: {
      kind: "result" as const,
      parse: parsePrettierOutput,
    },
  },
] as const;

const nodeTestRunnerAdapters = [
  {
    id: "vitest",
    displayName: "Vitest",
    supportedFacets: ["js"],
    command: {
      command: "npm",
      args: ["exec", "--", "vitest", "--run", "--reporter=json"],
    },
  },
  {
    id: "jest",
    displayName: "Jest",
    supportedFacets: ["js"],
    command: {
      command: "npm",
      args: ["exec", "--", "jest", "--runInBand", "--json"],
    },
  },
] as const;

export function getNodeQualityAdapters(): QualityRoutineAdapter[] {
  return [
    ...nodeCommandAdapters.map(createNodeCommandAdapter),
    createTypescriptAdapter(),
    ...nodeTestRunnerAdapters.map(createNodeTestRunnerAdapter),
  ];
}
