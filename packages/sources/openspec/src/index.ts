import type { SourcePlugin } from "@spectotal/direc-source-contracts";
import { loadSpecArtifacts, loadTaskArtifacts } from "./internal/artifacts.js";
import { createPathSignature } from "./internal/filesystem.js";

type OpenSpecOptions = {
  mode: "tasks" | "spec-change";
  changeFilter?: string;
  pollIntervalMs?: number;
};

export const openSpecSource: SourcePlugin<OpenSpecOptions> = {
  id: "openspec",
  displayName: "OpenSpec",
  seedArtifactTypes: ["source.openspec.task", "source.openspec.spec-change"],
  detect(context) {
    return context.hasOpenSpec;
  },
  async run(request) {
    const options = request.sourceConfig.options ?? { mode: "tasks" };
    return options.mode === "spec-change"
      ? loadSpecArtifacts(request.repositoryRoot, options.changeFilter)
      : loadTaskArtifacts(request.repositoryRoot, options.changeFilter);
  },
  async watch(request) {
    let previousSignature = "";
    const interval = setInterval(async () => {
      const seeds =
        request.sourceConfig.options?.mode === "spec-change"
          ? await loadSpecArtifacts(
              request.repositoryRoot,
              request.sourceConfig.options?.changeFilter,
            )
          : await loadTaskArtifacts(
              request.repositoryRoot,
              request.sourceConfig.options?.changeFilter,
            );
      const signature = JSON.stringify(
        await Promise.all(
          seeds.map(async (seed) => {
            const candidatePaths = seed.scope.paths ?? [];
            return candidatePaths.length > 0
              ? await createPathSignature(candidatePaths)
              : seed.type;
          }),
        ),
      );
      if (signature !== previousSignature) {
        previousSignature = signature;
        request.onChange();
      }
    }, request.sourceConfig.options?.pollIntervalMs ?? 1_000);

    return {
      close: () => {
        clearInterval(interval);
      },
    };
  },
};
