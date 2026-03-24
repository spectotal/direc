import type { QualityRoutineConfig } from "@spectotal/direc-analysis-runtime";
import { hasNodeTool } from "./node-detection.js";
import { hasPythonTool } from "./python-detection.js";
import type {
  NodeToolDetectionDefinition,
  PythonToolDetectionDefinition,
} from "./command-adapter-types.js";
import type { QualityRoutineDetectionContext } from "./types.js";

export function detectNodeTool(
  definition: NodeToolDetectionDefinition,
): (context: QualityRoutineDetectionContext) => QualityRoutineConfig | null {
  return (context) => {
    if (!hasNodeTool(context, definition.dependency, definition.configFiles)) {
      return null;
    }

    return createRunConfig(definition);
  };
}

export function detectPythonTool(
  definition: PythonToolDetectionDefinition,
): (context: QualityRoutineDetectionContext) => Promise<QualityRoutineConfig | null> {
  return async (context) => {
    if (!(await hasPythonTool(context, definition.tool))) {
      return null;
    }

    return createRunConfig(definition);
  };
}

export function createConfigCandidates(tool: string): string[] {
  return [`${tool}.config.ts`, `${tool}.config.js`];
}

function createRunConfig(definition: {
  id: string;
  command: {
    command: string;
    args: readonly string[];
  };
}): QualityRoutineConfig {
  return {
    adapter: definition.id,
    mode: "run",
    enabled: true,
    command: {
      command: definition.command.command,
      args: [...definition.command.args],
    },
  };
}
