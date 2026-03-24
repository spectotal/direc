import { Command } from "commander";
import { analyzeCommand } from "./commands/analyze.js";
import { initCommand } from "./commands/init.js";
import { runCommand } from "./commands/run.js";
import { doctorCommand } from "./commands/doctor.js";
import { packageVersion } from "./lib/package-version.js";

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
    .action(initCommand);

  program
    .command("run")
    .description("Load a spec file and execute the matching workflow.")
    .argument("[spec]", "path to a spec file", "specs/example.spec.md")
    .option("--dry-run", "print what would run without changing anything")
    .action(runCommand);

  program
    .command("analyze")
    .description("Run Direc analysis against OpenSpec change events.")
    .option("--change <name>", "limit analysis to a specific OpenSpec change")
    .option("--watch", "watch OpenSpec changes continuously")
    .action(analyzeCommand);

  program
    .command("doctor")
    .description("Inspect the current environment for expected direc inputs.")
    .action(doctorCommand);

  return program;
}
