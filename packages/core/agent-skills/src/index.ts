import { dirname, resolve } from "node:path";
import { ensureDirectory, writeFileSafe } from "./fs.js";
import { renderDirecBoundArtifacts } from "./direc-bound.js";
import {
  SCAFFOLD_BUNDLE_IDS,
  SUPPORTED_AGENTS,
  type ScaffoldBundleId,
  type ScaffoldRequest,
  type ScaffoldedArtifact,
  type SupportedAgent,
} from "./types.js";

export type { ScaffoldBundleId, ScaffoldRequest, ScaffoldedArtifact, SupportedAgent };

export function getSupportedAgents(): SupportedAgent[] {
  return [...SUPPORTED_AGENTS];
}

export async function scaffoldInitBundles(request: ScaffoldRequest): Promise<ScaffoldedArtifact[]> {
  const agents = normalizeSupportedAgents(request.agents);
  const bundles = normalizeBundleIds(request.bundles ?? ["direc-bound"]);
  const artifacts = bundles.flatMap((bundleId) => renderBundleArtifacts(bundleId, agents));

  for (const artifact of artifacts) {
    const absolutePath = resolve(request.repositoryRoot, artifact.path);
    await ensureDirectory(dirname(absolutePath));
    await writeFileSafe(absolutePath, artifact.contents, request.force ?? false);
  }

  return artifacts.map(({ agent, bundleId, path }) => ({
    agent,
    bundleId,
    path,
  }));
}

export function formatNextStepNotice(bundleId: ScaffoldBundleId): string {
  switch (bundleId) {
    case "direc-bound":
      return "Next step: run /direc-bound";
  }
}

function normalizeSupportedAgents(agents: readonly SupportedAgent[]): SupportedAgent[] {
  if (agents.length === 0) {
    throw new Error("At least one agent must be selected for scaffolding.");
  }

  const selectedAgents = new Set(agents);
  return SUPPORTED_AGENTS.filter((agent) => selectedAgents.has(agent));
}

function normalizeBundleIds(bundleIds: readonly ScaffoldBundleId[]): ScaffoldBundleId[] {
  if (bundleIds.length === 0) {
    throw new Error("At least one scaffold bundle must be selected.");
  }

  const selectedBundleIds = new Set(bundleIds);
  return SCAFFOLD_BUNDLE_IDS.filter((bundleId) => selectedBundleIds.has(bundleId));
}

function renderBundleArtifacts(
  bundleId: ScaffoldBundleId,
  agents: SupportedAgent[],
): Array<ScaffoldedArtifact & { contents: string }> {
  switch (bundleId) {
    case "direc-bound":
      return agents.flatMap((agent) => renderDirecBoundArtifacts(agent));
  }
}
