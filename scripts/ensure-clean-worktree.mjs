#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";

const output = execFileSync("git", ["status", "--porcelain"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (output.trim().length > 0) {
  process.stderr.write(
    "Release commands require a clean git worktree. Commit or stash changes first.\n",
  );
  process.exit(1);
}
