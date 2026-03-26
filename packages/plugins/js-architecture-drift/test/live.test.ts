import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import { WORKFLOW_IDS } from "@spectotal/direc-analysis-runtime";
import { createJsArchitectureDriftPlugin } from "../src/index.js";
import { resolveCompilerOptions } from "../src/graph/compiler-setup.js";

test("live architecture drift analysis", async () => {
  // The test runs from packages/plugins/js-architecture-drift
  // The monorepo root is 3 levels up
  const repositoryRoot = resolve(process.cwd(), "../../..");
  const debugFile =
    process.env.DEBUG_FILE || "packages/plugins/js-architecture-drift/src/defaults.ts";
  const isAbsolute = debugFile.startsWith("/");
  const targetPath = isAbsolute ? debugFile : resolve(repositoryRoot, debugFile);

  console.log("Running analysis on:", repositoryRoot);
  console.log("Debug target:", targetPath);

  const plugin = createJsArchitectureDriftPlugin();

  const snapshot = await plugin.run({
    repositoryRoot,
    event: {
      type: "snapshot",
      source: WORKFLOW_IDS.DIREC,
      timestamp: new Date().toISOString(),
      repositoryRoot,
      pathScopeMode: undefined,
      pathScopes: [targetPath],
    },
    detectedFacets: [
      {
        id: "js",
        confidence: "high",
        evidence: ["live-test"],
        metadata: {},
      },
    ],
    options: {
      excludePaths: [
        "node_modules",
        "dist",
        ".git",
        "packages/plugins/js-architecture-drift/test/fixtures",
      ],
      moduleRoles: [],
      roleBoundaryRules: [],
    },
    previousSnapshot: null,
  });

  console.log("Analysis completed. Found", snapshot.findings.length, "findings.");

  // Detailed TS Parse Data Logging (Moved from source to test)
  if (existsSync(targetPath)) {
    console.log("\n--- DETAILED TS PARSE DATA ---");
    const sourceText = readFileSync(targetPath, "utf8");
    const preProcessedInfo = ts.preProcessFile(sourceText, true, true);

    console.log(`[DEBUG] TS Pre-process info for ${targetPath}:`, {
      importedFiles: preProcessedInfo.importedFiles,
      referencedFiles: preProcessedInfo.referencedFiles,
    });

    const compilerOptions = resolveCompilerOptions({ repositoryRoot, targetPaths: [targetPath] });
    const host = ts.createCompilerHost(compilerOptions);

    for (const imported of preProcessedInfo.importedFiles) {
      const resolved = ts.resolveModuleName(imported.fileName, targetPath, compilerOptions, host);
      console.log(`[DEBUG] Resolution for "${imported.fileName}":`, {
        resolvedModule: resolved.resolvedModule,
      });
    }
    console.log("--- END DETAILED TS PARSE DATA ---\n");
  }
});
