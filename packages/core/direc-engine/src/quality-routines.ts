export type {
  QualityRoutineAdapter,
  QualityRoutineDetectionContext,
} from "./quality-routines/types.js";
export { createQualityRoutineAnalyzers } from "./quality-routines/analyzers.js";
export { detectQualityRoutines } from "./quality-routines/detect.js";

import type { QualityRoutineAdapter } from "./quality-routines/types.js";
import { getNodeQualityAdapters } from "./quality-routines/node-adapters.js";
import { getPythonQualityAdapters } from "./quality-routines/python-adapters.js";

export function getBuiltinQualityAdapters(): QualityRoutineAdapter[] {
  return [...getNodeQualityAdapters(), ...getPythonQualityAdapters()];
}
