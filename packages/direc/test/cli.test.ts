import assert from "node:assert/strict";
import test from "node:test";
import { createCli } from "../src/cli.js";

test("registers the starter commands", () => {
  const program = createCli();
  const commandNames = program.commands.map((command) => command.name());

  assert.deepEqual(commandNames, ["init", "run", "doctor"]);
});
