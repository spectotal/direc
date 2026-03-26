import { brandText } from "../brand/tokens.js";

type CompletionOutput = {
  write(chunk: string | Uint8Array, ...args: unknown[]): boolean;
};

export function renderInitCompletion(options: {
  summaryLines: string[];
  nextStep?: string;
  stdout?: CompletionOutput;
}): void {
  const stdout = options.stdout ?? process.stdout;
  const lines = [
    "",
    `${brandText.strong("DIREC")} ${brandText.success("Ready")}`,
    ...options.summaryLines.map((line) => `  ${line}`),
  ];

  if (options.nextStep) {
    lines.push("", brandText.accent(options.nextStep));
  }

  lines.push("", brandText.muted("Workspace initialization complete."), "");
  stdout.write(`${lines.join("\n")}`);
}
