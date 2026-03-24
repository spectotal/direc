import { createTestRunnerAdapter } from "./adapter-helpers.js";
import { createConfigCandidates, detectNodeTool, detectPythonTool } from "./tool-detection.js";
import type { TestRunnerDefinition } from "./command-adapter-types.js";
import type { QualityRoutineAdapter } from "./types.js";

export function createNodeTestRunnerAdapter(
  definition: TestRunnerDefinition,
): QualityRoutineAdapter {
  return createTestRunnerAdapter({
    id: definition.id,
    displayName: definition.displayName,
    supportedFacets: [...definition.supportedFacets],
    detect: detectNodeTool({
      id: definition.id,
      dependency: definition.id,
      configFiles: createConfigCandidates(definition.id),
      command: definition.command,
    }),
  });
}

export function createPythonTestRunnerAdapter(
  definition: TestRunnerDefinition,
): QualityRoutineAdapter {
  return createTestRunnerAdapter({
    id: definition.id,
    displayName: definition.displayName,
    supportedFacets: [...definition.supportedFacets],
    detect: detectPythonTool({
      id: definition.id,
      tool: definition.id,
      command: definition.command,
    }),
  });
}
