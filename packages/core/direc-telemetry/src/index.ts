// Public API — mainly useful for programmatic use or testing.
// For instrumentation, use the preload entry point instead:
//   NODE_OPTIONS='--import direc-telemetry/preload' direc <command>

export { tracer } from "./tracer.js";
export type { Span, SpanStatus } from "./tracer.js";
export { printConsoleTrace } from "./exporters/console.js";
export { writePerfettoTrace } from "./exporters/perfetto.js";
