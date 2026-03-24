import { createCommandAdapter } from "./command-adapter-factory.js";
import { detectNodeTool, detectPythonTool } from "./tool-detection.js";
import type {
  NodeCommandAdapterDefinition,
  PythonCommandAdapterDefinition,
} from "./command-adapter-types.js";
import type { QualityRoutineAdapter } from "./types.js";

export function createNodeCommandAdapter(
  definition: NodeCommandAdapterDefinition,
): QualityRoutineAdapter {
  return createCommandAdapter(definition, detectNodeTool(definition));
}

export function createPythonCommandAdapter(
  definition: PythonCommandAdapterDefinition,
): QualityRoutineAdapter {
  return createCommandAdapter(definition, detectPythonTool(definition));
}
