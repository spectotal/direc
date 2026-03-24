import type { DirecConfig } from "./types.js";

export function normalizeAutomationConfig(value: unknown): DirecConfig["automation"] {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    ...(value as Omit<NonNullable<DirecConfig["automation"]>, "triggers">),
    triggers: normalizeAutomationTriggers(value.triggers),
  };
}

function normalizeAutomationTriggers(
  value: unknown,
): NonNullable<DirecConfig["automation"]>["triggers"] {
  if (isRecord(value)) {
    const legacyOpenSpec = isRecord(value.openspec) ? value.openspec : undefined;

    return {
      snapshotEvents: typeof value.snapshotEvents === "boolean" ? value.snapshotEvents : true,
      workItemTransitions:
        typeof value.workItemTransitions === "boolean"
          ? value.workItemTransitions
          : typeof legacyOpenSpec?.taskDiffs === "boolean"
            ? legacyOpenSpec.taskDiffs
            : true,
      artifactTransitions:
        typeof value.artifactTransitions === "boolean"
          ? value.artifactTransitions
          : typeof legacyOpenSpec?.artifactTransitions === "boolean"
            ? legacyOpenSpec.artifactTransitions
            : false,
      changeCompleted:
        typeof value.changeCompleted === "boolean"
          ? value.changeCompleted
          : typeof legacyOpenSpec?.changeCompleted === "boolean"
            ? legacyOpenSpec.changeCompleted
            : true,
    };
  }

  return {
    snapshotEvents: true,
    workItemTransitions: true,
    artifactTransitions: false,
    changeCompleted: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
