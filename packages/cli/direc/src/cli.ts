import { Command } from "commander";
import { analyzeCommand } from "./commands/analyze.js";
import { automateCommand } from "./commands/automate.js";
import { initCommand } from "./commands/init.js";
import { runCommand } from "./commands/run.js";
import { doctorCommand } from "./commands/doctor.js";
import { vizCommand } from "./commands/viz.js";
import { packageVersion } from "./lib/package-version.js";

function collectValues(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function createCli(): Command {
  const program = new Command();

  program
    .name("direc")
    .description("Spec-driven development tooling for turning specs into workflows.")
    .version(packageVersion)
    .showHelpAfterError();

  program
    .command("init")
    .description("Create a baseline direc workspace in the current directory.")
    .option("--force", "overwrite existing direc config files")
    .option("--agent <name>", "scaffold repo-local files for an agent", collectValues, [])
    .option("--extension <module>", "load an extension module", collectValues, [])
    .action(initCommand);

  program
    .command("run")
    .description("Load a spec file and execute the matching workflow.")
    .argument("[spec]", "path to a spec file", "specs/example.spec.md")
    .option("--dry-run", "print what would run without changing anything")
    .action(runCommand);

  program
    .command("analyze")
    .description("Run Direc analysis for the repository or a scoped workflow change.")
    .option("--workflow <name>", "workflow to analyze")
    .option("--change <name>", "scope analysis using the selected workflow's change semantics")
    .option("--watch", "watch the selected workflow continuously")
    .option("--extension <module>", "load an extension module", collectValues, [])
    .action(analyzeCommand);

  program
    .command("automate")
    .description("Watch workflow events, run analyzers, and dispatch automation requests.")
    .option("--workflow <name>", "workflow event source to watch")
    .option("--change <name>", "limit automation to a workflow-specific change scope")
    .option("--extension <module>", "load an extension module", collectValues, [])
    .action(automateCommand);

  program
    .command("doctor")
    .description("Inspect the current environment for expected direc inputs.")
    .option("--extension <module>", "load an extension module", collectValues, [])
    .action(doctorCommand);

  program
    .command("viz")
    .description("Generate an HTML visualization of bounded architecture and complexity data.")
    .option("--out <path>", "output file path", "./direc-viz.html")
    .option("--open", "open the generated file in the default browser")
    .action(vizCommand);

  return program;
}
