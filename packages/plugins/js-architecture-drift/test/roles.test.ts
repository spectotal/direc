import assert from "node:assert/strict";
import test from "node:test";
import {
  collectModuleRoleAssignments,
  collectRoleBoundaryViolations,
  collectUnassignedModuleFindings,
} from "../src/roles.js";

test("collectModuleRoleAssignments maps modules to configured roles", () => {
  const assignments = collectModuleRoleAssignments(
    {
      "packages/adapters/direc/src/adapter.ts": [
        "packages/adapters/direc/src/events.ts",
        "packages/adapters/direc/src/git.ts",
      ],
      "packages/adapters/direc/src/events.ts": [],
      "packages/adapters/direc/src/git.ts": [],
    },
    [
      {
        role: "workflow-orchestrator",
        match: ["packages/adapters/direc/src/adapter.ts"],
      },
      {
        role: "workflow-event-shaper",
        match: ["packages/adapters/direc/src/events.ts"],
      },
      {
        role: "workflow-change-loader",
        match: ["packages/adapters/direc/src/git.ts"],
      },
    ],
  );

  assert.deepEqual(assignments, {
    "packages/adapters/direc/src/adapter.ts": ["workflow-orchestrator"],
    "packages/adapters/direc/src/events.ts": ["workflow-event-shaper"],
    "packages/adapters/direc/src/git.ts": ["workflow-change-loader"],
  });
});

test("collectRoleBoundaryViolations reports forbidden role-to-role dependencies", () => {
  const graph = {
    "packages/adapters/direc/src/events.ts": ["packages/adapters/direc/src/git.ts"],
    "packages/adapters/direc/src/git.ts": [],
  };
  const assignments = collectModuleRoleAssignments(graph, [
    {
      role: "workflow-event-shaper",
      match: ["packages/adapters/direc/src/events.ts"],
    },
    {
      role: "workflow-change-loader",
      match: ["packages/adapters/direc/src/git.ts"],
    },
  ]);

  const findings = collectRoleBoundaryViolations(process.cwd(), graph, assignments, [
    {
      fromRoles: ["workflow-event-shaper"],
      disallowRoles: ["workflow-change-loader"],
      message: "Event shapers must not load workflow changes.",
    },
  ]);

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.category, "forbidden-role-dependency");
  assert.equal(findings[0]?.scope.dependency?.from, "packages/adapters/direc/src/events.ts");
  assert.equal(findings[0]?.scope.dependency?.to, "packages/adapters/direc/src/git.ts");
  assert.deepEqual(findings[0]?.details, {
    fromRoles: ["workflow-event-shaper"],
    dependencyRoles: ["workflow-change-loader"],
  });
});

test("collectUnassignedModuleFindings reports adjacent modules without roles", () => {
  const graph = {
    "packages/adapters/direc/src/adapter.ts": ["packages/adapters/direc/src/helper.ts"],
    "packages/adapters/direc/src/helper.ts": [],
  };
  const assignments = collectModuleRoleAssignments(graph, [
    {
      role: "workflow-orchestrator",
      match: ["packages/adapters/direc/src/adapter.ts"],
    },
  ]);

  const findings = collectUnassignedModuleFindings(process.cwd(), graph, assignments);

  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.category, "unassigned-module");
  assert.equal(findings[0]?.scope.path?.endsWith("packages/adapters/direc/src/helper.ts"), true);
  assert.deepEqual(findings[0]?.details, {
    assignedDependencies: [],
    assignedDependents: ["packages/adapters/direc/src/adapter.ts"],
  });
});
