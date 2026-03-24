import type { QualityRoutineDetectionContext } from "./types.js";

export function hasNodeTool(
  context: QualityRoutineDetectionContext,
  dependency: string,
  configFiles: string[],
): boolean {
  const scripts = context.rootManifest?.scripts ?? {};
  const dependencies = {
    ...(context.rootManifest?.dependencies ?? {}),
    ...(context.rootManifest?.devDependencies ?? {}),
  };

  return (
    dependency in dependencies ||
    Object.values(scripts).some(
      (script): script is string => typeof script === "string" && script.includes(dependency),
    ) ||
    context.scan.files.some((file: string) =>
      configFiles.some((configFile) => file === configFile || file.startsWith(`${configFile}.`)),
    )
  );
}
