#!/usr/bin/env node

import { main } from "../dist/src/index.js";

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
