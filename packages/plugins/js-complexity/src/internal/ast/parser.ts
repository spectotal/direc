import type { TSESTree } from "@typescript-eslint/typescript-estree";
import { parse } from "@typescript-eslint/typescript-estree";
import type { AnalyzerPrerequisiteResult } from "@spectotal/direc-analysis-runtime";
import { extname } from "node:path";

type ParsedProgram = TSESTree.Program & {
  tokens: TSESTree.Token[];
};

const JSX_EXTENSIONS = new Set([".jsx", ".tsx"]);
const MODULE_SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"]);
const SCRIPT_SOURCE_EXTENSIONS = new Set([".cjs", ".cts"]);

export async function defaultPrerequisiteCheck(): Promise<AnalyzerPrerequisiteResult> {
  try {
    await Promise.all([
      import("@typescript-eslint/typescript-estree"),
      import("@typescript-eslint/visitor-keys"),
    ]);

    return {
      ok: true,
      summary: "typescript-estree parser is available.",
    };
  } catch (error) {
    return {
      ok: false,
      summary: "typescript-estree parser is not available.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export function parseSource(source: string, filePath: string): ParsedProgram {
  const extension = extname(filePath).toLowerCase();
  const jsx = JSX_EXTENSIONS.has(extension);
  const sourceTypes = resolveSourceTypes(extension);
  let lastError: unknown;

  for (const sourceType of sourceTypes) {
    try {
      return parse(source, {
        comment: false,
        filePath,
        jsDocParsingMode: "none",
        jsx,
        loc: true,
        range: true,
        sourceType,
        tokens: true,
      }) as ParsedProgram;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function resolveSourceTypes(extension: string): Array<"module" | "script"> {
  if (SCRIPT_SOURCE_EXTENSIONS.has(extension)) {
    return ["script", "module"];
  }

  if (MODULE_SOURCE_EXTENSIONS.has(extension)) {
    return ["module", "script"];
  }

  return ["module", "script"];
}
