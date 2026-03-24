import assert from "node:assert/strict";
import test from "node:test";
import { createCli } from "../src/cli.js";

test("registers the starter commands", () => {
  const program = createCli();
  const commandNames = program.commands.map((command) => command.name());

  assert.deepEqual(commandNames, ["init", "run", "analyze", "doctor"]);
});

test("registers analyze command options", () => {
  const program = createCli();
  const analyze = program.commands.find((command) => command.name() === "analyze");

  assert.ok(analyze);
  assert.deepEqual(
    analyze.options.map((option) => option.long),
    ["--change", "--watch"],
  );
});
