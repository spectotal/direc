import type { CommandToolConfig } from "@spectotal/direc-analysis-contracts";
import type { ArtifactSeed } from "@spectotal/direc-artifact-contracts";
import { runCommandNode } from "./command-exec.js";

export async function readCommandArtifacts(
  config: CommandToolConfig,
  repositoryRoot: string,
  input: Record<string, unknown>,
): Promise<ArtifactSeed[]> {
  const payload = await runCommandNode(config, repositoryRoot, input);
  if (!hasArtifacts(payload)) {
    throw new Error(`Command node ${config.id} did not return an artifacts array.`);
  }

  return payload.artifacts.map((artifact) => {
    if (!config.produces.includes(artifact.type)) {
      throw new Error(
        `Command node ${config.id} produced unexpected artifact type ${artifact.type}.`,
      );
    }

    return artifact;
  });
}

function hasArtifacts(payload: unknown): payload is { artifacts: ArtifactSeed[] } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "artifacts" in payload &&
    Array.isArray((payload as { artifacts?: unknown }).artifacts)
  );
}
