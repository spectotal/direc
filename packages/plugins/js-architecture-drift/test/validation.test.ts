import assert from "node:assert/strict";
import test from "node:test";
import { validateRoleConfiguration } from "../src/validation.js";

test("validateRoleConfiguration reports broken role and rule definitions", () => {
  const findings = validateRoleConfiguration(
    process.cwd(),
    [
      {
        role: "workflow-orchestrator",
        match: ["src/adapter.ts"],
      },
      {
        role: "workflow-orchestrator",
        match: [],
      },
      {
        role: "",
        match: [""],
      },
    ],
    [
      {
        sourceRole: "workflow-orchestrator",
        allSourceRoles: ["missing-source-role"],
        onlyDependOnRoles: [],
        notDependOnRoles: ["missing-role"],
      },
      {
        sourceRole: "",
        onlyDependOnRoles: ["missing-role"],
      },
      {
        allSourceRoles: [""],
      },
    ],
  );

  assert.deepEqual(
    findings.map((finding) => finding.category),
    Array(findings.length).fill("invalid-role-config"),
  );
  assert.ok(findings.some((finding) => finding.message.includes("defined more than once")));
  assert.ok(findings.some((finding) => finding.message.includes("must define at least one match")));
  assert.ok(findings.some((finding) => finding.message.includes("missing a non-empty role name")));
  assert.ok(findings.some((finding) => finding.message.includes("empty match pattern")));
  assert.ok(
    findings.some((finding) =>
      finding.message.includes('must define exactly one of "sourceRole" or "allSourceRoles"'),
    ),
  );
  assert.ok(
    findings.some((finding) =>
      finding.message.includes(
        'must define at least one of "onlyDependOnRoles" or "notDependOnRoles"',
      ),
    ),
  );
  assert.ok(findings.some((finding) => finding.message.includes("unknown source roles")));
  assert.ok(findings.some((finding) => finding.message.includes("unknown onlyDependOnRoles")));
  assert.ok(findings.some((finding) => finding.message.includes("unknown notDependOnRoles")));
});
