import { isAbsolute, resolve } from "node:path";
import type { AnalyzerFinding } from "@spectotal/direc-analysis-runtime";

export function createRepositoryFinding(options: {
  analyzerId: string;
  severity: "info" | "warning" | "error";
  category: string;
  message: string;
  repositoryRoot: string;
}): AnalyzerFinding {
  return {
    fingerprint: `${options.analyzerId}:${options.category}`,
    analyzerId: options.analyzerId,
    severity: options.severity,
    category: options.category,
    message: options.message,
    scope: {
      kind: "repository",
      path: options.repositoryRoot,
    },
  };
}

export function normalizeFindingPath(repositoryRoot: string, filePath: string): string {
  return isAbsolute(filePath) ? filePath : resolve(repositoryRoot, filePath);
}

export function safeJsonParse<T>(value: string): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return typeof value === "object" && value !== null && "code" in value;
}
