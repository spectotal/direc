/**
 * Direc telemetry preloader.
 *
 * Load via Node's --import flag:
 *   NODE_OPTIONS='--import direc-telemetry/preload' direc analyze
 *
 * Control output via DIREC_TRACE env var:
 *   DIREC_TRACE=console   — pretty span tree to stderr only
 *   DIREC_TRACE=file      — Perfetto JSON to .direc/traces/ only
 *   DIREC_TRACE=all       — both (default)
 *   DIREC_TRACE=off       — disable all output
 */

import { register } from "node:module";

// Must be called before any application modules are imported.
// This registers the import-in-the-middle ESM loader hook that makes
// module exports patchable at runtime.
register("import-in-the-middle/hook.mjs", import.meta.url);

// Dynamic imports ensure these run after register() above, so the IITM
// loader is active before we set up any hooks.
const { registerHooks } = await import("./hooks.js");
const { tracer } = await import("./tracer.js");
const { printConsoleTrace } = await import("./exporters/console.js");
const { writePerfettoTrace } = await import("./exporters/perfetto.js");

registerHooks();

const mode = (process.env["DIREC_TRACE"] ?? "all").toLowerCase();

if (mode !== "off") {
  let flushed = false;

  async function flush(): Promise<void> {
    if (flushed) return;
    flushed = true;

    const spans = tracer.spans;
    if (spans.length === 0) return;

    if (mode === "console" || mode === "all") {
      printConsoleTrace(spans);
    }

    if (mode === "file" || mode === "all") {
      const repoRoot = spans.find((s) => typeof s.attrs["repositoryRoot"] === "string")?.attrs[
        "repositoryRoot"
      ] as string | undefined;

      if (repoRoot) {
        try {
          const outPath = await writePerfettoTrace(spans, repoRoot);
          if (outPath) {
            process.stderr.write(
              `\ndirec trace → ${outPath}\nopen at: https://ui.perfetto.dev\n\n`,
            );
          }
        } catch {
          // silently skip if file write fails
        }
      }
    }
  }

  // beforeExit fires when the event loop drains — gives async operations a chance to finish
  process.on("beforeExit", flush);

  // SIGINT / SIGTERM: flush synchronously what we can, then exit
  process.on("SIGINT", () => {
    flush().finally(() => process.exit(130));
  });
}
