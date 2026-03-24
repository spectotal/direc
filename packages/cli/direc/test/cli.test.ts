import assert from "node:assert/strict";
import test from "node:test";
import { createCli } from "../src/cli.js";

test("registers the starter commands", () => {
  const program = createCli();
  const commandNames = program.commands.map((command) => command.name());

  assert.deepEqual(commandNames, ["init", "run", "analyze", "automate", "doctor"]);
});

test("registers analyze command options", () => {
  const program = createCli();
  const analyze = program.commands.find((command) => command.name() === "analyze");

  assert.ok(analyze);
  assert.deepEqual(
    analyze.options.map((option) => option.long),
    ["--workflow", "--change", "--watch", "--extension"],
  );
});

test("registers automate command options", () => {
  const program = createCli();
  const automate = program.commands.find((command) => command.name() === "automate");

  assert.ok(automate);
  assert.deepEqual(
    automate.options.map((option) => option.long),
    ["--workflow", "--change", "--extension"],
  );
});

test("registers init and doctor extension options", () => {
  const program = createCli();
  const init = program.commands.find((command) => command.name() === "init");
  const doctor = program.commands.find((command) => command.name() === "doctor");

  assert.ok(init);
  assert.ok(doctor);
  assert.deepEqual(
    init.options.map((option) => option.long),
    ["--force", "--extension"],
  );
  assert.deepEqual(
    doctor.options.map((option) => option.long),
    ["--extension"],
  );
});
