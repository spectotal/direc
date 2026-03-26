import assert from "node:assert/strict";
import test from "node:test";
import { renderBrandIntro, shouldAnimateBrandIntro } from "../src/ui/brand/intro.js";

test("renderBrandIntro writes a text-only heading when tty rendering is enabled", async () => {
  const chunks: string[] = [];

  await renderBrandIntro({
    stdout: {
      isTTY: true,
      write(chunk: string | Uint8Array) {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      },
    },
    environment: {},
  });

  const output = chunks.join("");
  assert.match(output, /DIREC INIT/);
  assert.match(output, /Spec-driven setup for repo-local agent workflows\./);
});

test("renderBrandIntro skips animation when stdout is not a tty", async () => {
  const chunks: string[] = [];

  await renderBrandIntro({
    stdout: {
      isTTY: false,
      write(chunk: string | Uint8Array) {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
      },
    },
  });

  assert.equal(chunks.join(""), "");
  assert.equal(
    shouldAnimateBrandIntro(
      {
        isTTY: true,
        write() {
          return true;
        },
      },
      { CI: "true" },
    ),
    false,
  );
});
