import type { BaseArchitectureDriftPluginOptions } from "@spectotal/direc-core-architecture-drift";

export interface ArchitectureDriftPluginOptions extends BaseArchitectureDriftPluginOptions {
  tsConfigPath?: string;
}

export type JsArchitectureRunnerOptions = {
  tsConfigPath?: string;
  packageBoundaries?: Array<{ name?: string; root?: string }>;
};
