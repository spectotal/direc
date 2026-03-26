import { BRAND_SPACING, brandText } from "./tokens.js";

type IntroOutput = {
  isTTY?: boolean;
  write(chunk: string | Uint8Array, ...args: unknown[]): boolean;
};

export function shouldAnimateBrandIntro(
  stdout: IntroOutput = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(stdout.isTTY) && !environment.CI;
}

export async function renderBrandIntro(
  options: {
    stdout?: IntroOutput;
    environment?: NodeJS.ProcessEnv;
  } = {},
): Promise<void> {
  const stdout = options.stdout ?? process.stdout;

  if (!shouldAnimateBrandIntro(stdout, options.environment)) {
    return;
  }

  stdout.write(renderIntroBlock());
}

function renderIntroBlock(): string {
  const lines = [
    BRAND_SPACING.introLineGap,
    `  ${brandText.strong("DIREC INIT")} ${brandText.accent("◆")}`,
    `  ${brandText.muted("Spec-driven setup for repo-local agent workflows.")}`,
    "",
  ];
  return lines.map((line) => `\u001B[2K${line}\n`).join("");
}
