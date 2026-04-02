import assert from "node:assert/strict";
import test from "node:test";
import { createComplexityGateResult, deriveComplexityGateStatus } from "../src/index.js";

function createBasePayload() {
  return {
    warningThreshold: 10,
    errorThreshold: 20,
    warningFiles: [],
    errorFiles: [],
    skippedFiles: [],
    warningCount: 0,
    errorCount: 0,
  };
}

test("deriveComplexityGateStatus returns pass when there are no warnings or errors", () => {
  const payload = createBasePayload();

  assert.equal(deriveComplexityGateStatus(payload), "pass");
  assert.equal(createComplexityGateResult(payload).status, "pass");
});

test("deriveComplexityGateStatus returns warn when warnings or skipped files exist", () => {
  const basePayload = createBasePayload();
  const warningResult = createComplexityGateResult({
    ...basePayload,
    warningFiles: [
      {
        path: "/repo/src/index.ts",
        cyclomatic: 12,
        logicalSloc: 18,
        maintainability: 91,
      },
    ],
    warningCount: 1,
  });
  const skippedResult = createComplexityGateResult({
    ...createBasePayload(),
    skippedFiles: [
      {
        path: "/repo/src/generated.ts",
        message: "unsupported syntax",
      },
    ],
    warningCount: 1,
  });

  assert.equal(warningResult.status, "warn");
  assert.equal(skippedResult.status, "warn");
});

test("deriveComplexityGateStatus returns block when error files exist", () => {
  const result = createComplexityGateResult({
    ...createBasePayload(),
    errorFiles: [
      {
        path: "/repo/src/error.ts",
        cyclomatic: 24,
        logicalSloc: 42,
        maintainability: 72,
      },
    ],
    errorCount: 1,
  });

  assert.equal(result.status, "block");
});
