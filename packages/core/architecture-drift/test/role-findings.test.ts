import assert from "node:assert/strict";
import test from "node:test";
import { buildRoleBoundaryFinding, buildUnassignedModuleFinding } from "../src/index.js";

const TEST_CONTEXT = { analyzerId: "test-analyzer", facetId: "test-facet" };

test("buildRoleBoundaryFinding preserves dependency-edge details", () => {
  const finding = buildRoleBoundaryFinding({
    repositoryRoot: "/tmp/repository",
    fromModule: "src/a.ts",
    dependency: "src/b.ts",
    sourceRoles: ["ui"],
    dependencyRoles: ["data"],
    allowedRoles: ["shared"],
    forbiddenRoles: ["data"],
    matchedForbiddenRoles: ["data"],
    violationKinds: ["onlyDependOnRoles", "notDependOnRoles"],
    message: "ui must only depend on shared and must not depend on data",
    context: TEST_CONTEXT,
  });

  assert.equal(finding.category, "forbidden-role-dependency");
  assert.equal(finding.scope.dependency?.from, "src/a.ts");
  assert.equal(finding.scope.dependency?.to, "src/b.ts");
  assert.deepEqual(finding.details, {
    sourceRoles: ["ui"],
    dependencyRoles: ["data"],
    allowedRoles: ["shared"],
    forbiddenRoles: ["data"],
    matchedForbiddenRoles: ["data"],
    violationKinds: ["onlyDependOnRoles", "notDependOnRoles"],
  });
});

test("buildUnassignedModuleFinding preserves adjacent dependency details", () => {
  const finding = buildUnassignedModuleFinding({
    repositoryRoot: "/tmp/repository",
    modulePath: "src/helper.ts",
    assignedDependencies: ["src/core.ts"],
    assignedDependents: ["src/ui.ts"],
    context: TEST_CONTEXT,
  });

  assert.equal(finding.category, "unassigned-module");
  assert.equal(finding.scope.path.endsWith("src/helper.ts"), true);
  assert.deepEqual(finding.details, {
    assignedDependencies: ["src/core.ts"],
    assignedDependents: ["src/ui.ts"],
  });
});
