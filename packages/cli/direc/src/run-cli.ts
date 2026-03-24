import { createCli } from "./cli.js";

export async function runCli(argv = process.argv): Promise<void> {
  const program = createCli();
  await program.parseAsync(argv);
}
