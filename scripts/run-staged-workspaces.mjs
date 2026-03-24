#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const scriptsToRun = process.argv.slice(2);

if (scriptsToRun.length === 0) {
  process.stderr.write("Expected at least one workspace script name.\n");
  process.exit(1);
}

const rootPackageJson = readJson(resolve(rootDir, "package.json"));
const workspaces = loadWorkspaces(rootDir, rootPackageJson.workspaces ?? []);
const stagedFiles = getStagedFiles(rootDir);

if (stagedFiles.length === 0) {
  process.stdout.write("No staged files detected. Skipping workspace checks.\n");
  process.exit(0);
}

const impactedWorkspaces = resolveImpactedWorkspaces(stagedFiles, workspaces);

if (impactedWorkspaces.length === 0) {
  process.stdout.write("No workspace package changes detected. Skipping workspace checks.\n");
  process.exit(0);
}

for (const workspace of impactedWorkspaces) {
  for (const scriptName of scriptsToRun) {
    const script = workspace.packageJson.scripts?.[scriptName];

    if (!script) {
      if (scriptName === "test") {
        process.stdout.write(
          `Skipping ${scriptName} for ${workspace.packageJson.name}; no script defined.\n`,
        );
        continue;
      }

      process.stderr.write(
        `Workspace ${workspace.packageJson.name} is missing required script "${scriptName}".\n`,
      );
      process.exit(1);
    }

    process.stdout.write(`Running ${scriptName} in ${workspace.packageJson.name}\n`);
    execFileSync(pnpmCommand(), ["run", scriptName, "--filter", workspace.packageJson.name], {
      cwd: rootDir,
      stdio: "inherit",
    });
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function loadWorkspaces(rootPath, workspacePatterns) {
  const workspaceDirs = new Map();

  for (const pattern of workspacePatterns) {
    if (pattern.endsWith("/*")) {
      const baseDir = resolve(rootPath, pattern.slice(0, -2));

      for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }

        const relativeDir = `${pattern.slice(0, -1)}${entry.name}`;
        workspaceDirs.set(relativeDir, resolve(rootPath, relativeDir));
      }

      continue;
    }

    workspaceDirs.set(pattern, resolve(rootPath, pattern));
  }

  return [...workspaceDirs.entries()].map(([relativeDir, absoluteDir]) => ({
    absoluteDir,
    relativeDir: toPosix(relativeDir),
    packageJson: readJson(resolve(absoluteDir, "package.json")),
  }));
}

function getStagedFiles(rootPath) {
  const output = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: rootPath,
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/u)
    .map((filePath) => filePath.trim())
    .filter(Boolean)
    .map(toPosix);
}

function resolveImpactedWorkspaces(stagedPaths, workspaces) {
  if (stagedPaths.some(isSharedWorkspaceChange)) {
    return workspaces;
  }

  return workspaces.filter((workspace) =>
    stagedPaths.some(
      (filePath) =>
        filePath === workspace.relativeDir || filePath.startsWith(`${workspace.relativeDir}/`),
    ),
  );
}

function isSharedWorkspaceChange(filePath) {
  if (filePath.startsWith(".husky/") || filePath.startsWith("scripts/")) {
    return true;
  }

  return [
    "package.json",
    "package-lock.json",
    "eslint.config.mjs",
    ".prettierrc.json",
    ".prettierignore",
    "tsconfig.base.json",
  ].includes(filePath);
}

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function toPosix(filePath) {
  return filePath.replaceAll("\\", "/");
}
