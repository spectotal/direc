import {
  bootstrapAnalysisEnvironment,
  buildDirecConfig,
  resolveAnalyzers,
} from "@spectotal/direc-engine";
import type { SupportedAgent } from "@spectotal/direc-agent-skills";

type InitEnvironment = Awaited<ReturnType<typeof bootstrapAnalysisEnvironment>>;
type InitConfig = Awaited<ReturnType<typeof buildDirecConfig>>["config"];
type AnalyzerResolution = Awaited<ReturnType<typeof resolveAnalyzers>>;

export function assertConfiguredAnalyzers(
  config: InitConfig,
  resolution: AnalyzerResolution,
): string[] {
  const configuredAnalyzerIds = Object.entries(config.analyzers)
    .filter(([, entry]) => entry.enabled !== false)
    .map(([analyzerId]) => analyzerId);

  if (configuredAnalyzerIds.length === 0) {
    throw new Error(
      [
        "No supported analyzer set could be resolved for this repository.",
        resolution.disabled
          .flatMap((entry) => entry.reasons.map((reason) => `- ${reason.message}`))
          .join("\n") || "- No supported facets were detected.",
      ].join("\n"),
    );
  }

  return configuredAnalyzerIds;
}

export function formatInitSummary(
  repositoryRoot: string,
  config: InitConfig,
  environment: InitEnvironment,
  configuredAnalyzerIds: string[],
  options: {
    selectedAgents?: SupportedAgent[];
    nextStep?: string;
  } = {},
): string {
  return `${buildInitSummaryLines(repositoryRoot, config, environment, configuredAnalyzerIds, options).join("\n")}\n`;
}

export function buildInitSummaryLines(
  repositoryRoot: string,
  config: InitConfig,
  environment: InitEnvironment,
  configuredAnalyzerIds: string[],
  options: {
    selectedAgents?: SupportedAgent[];
    nextStep?: string;
  } = {},
): string[] {
  const lines = [`Initialized Direc workspace in ${repositoryRoot}`];

  lines.push(
    `Detected facets: ${environment.detectedFacets.map((facet) => facet.id).join(", ") || "none"}`,
  );
  lines.push(`Workflow: ${config.workflow}`);
  lines.push(`Enabled analyzers: ${configuredAnalyzerIds.join(", ") || "none"}`);
  lines.push(`Quality routines: ${Object.keys(environment.qualityRoutines).join(", ") || "none"}`);
  lines.push(formatAutomationLine(config));
  lines.push(`Extensions: ${environment.extensionSources.join(", ") || "none"}`);
  lines.push(`Scaffolded agents: ${options.selectedAgents?.join(", ") || "none"}`);

  if (options.nextStep) {
    lines.push(options.nextStep);
  }

  return lines;
}

function formatAutomationLine(config: InitConfig): string {
  if (config.automation) {
    return `Automation: ${config.automation.mode}, ${config.automation.invocation}, ${config.automation.transport.kind}`;
  }

  return "Automation: not configured";
}
