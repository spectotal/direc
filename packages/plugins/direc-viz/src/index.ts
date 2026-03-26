import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { readVizConfig } from "./reader/config-reader.js";
import { readLatestSnapshot } from "./reader/snapshot-reader.js";
import { readHistory } from "./reader/history-reader.js";
import { buildVizModel } from "./model/builder.js";
import { serialise } from "./render/serialise.js";

export async function generateViz(repositoryRoot: string, outPath: string): Promise<void> {
  const config = await readVizConfig(repositoryRoot);

  const [driftSnapshot, complexitySnapshot] = await Promise.all([
    readLatestSnapshot(repositoryRoot, "js-architecture-drift"),
    readLatestSnapshot(repositoryRoot, "js-complexity"),
  ]);

  if (!driftSnapshot && !complexitySnapshot) {
    process.stderr.write(
      "Warning: No analyzer snapshots found in .direc/latest/. " +
        "Run `direc analyze` first for full visualization.\n",
    );
  }

  const historyPoints = await readHistory(repositoryRoot);

  const model = buildVizModel(config, driftSnapshot, complexitySnapshot, historyPoints);
  const html = serialise(model);

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html, "utf-8");
}
