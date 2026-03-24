import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", ".husky/_/**"],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.ts"],
    languageOptions: {
      ...(config.languageOptions ?? {}),
      globals: globals.node,
    },
  })),
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: [
      "**/*.test.ts",
      "packages/adapters/**",
      "packages/core/workflow-runtime/src/workflows.ts",
      "packages/cli/direc/src/cli.ts",
      "packages/cli/direc/src/registry/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value='openspec']",
          message: "Use WORKFLOW_IDS.OPENSPEC instead of a raw workflow string.",
        },
        {
          selector: "Literal[value='direc']",
          message: "Use WORKFLOW_IDS.DIREC instead of a raw workflow string.",
        },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: ["**/*.test.ts", "packages/core/workflow-runtime/src/events.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value='snapshot']",
          message: "Use WORKFLOW_EVENT_TYPES.SNAPSHOT instead of a raw workflow event type string.",
        },
        {
          selector: "Literal[value='transition']",
          message:
            "Use WORKFLOW_EVENT_TYPES.TRANSITION instead of a raw workflow event type string.",
        },
        {
          selector: "Literal[value='work_item_transition']",
          message:
            "Use WORKFLOW_EVENT_TYPES.WORK_ITEM_TRANSITION instead of a raw workflow event type string.",
        },
        {
          selector: "Literal[value='change_completed']",
          message:
            "Use WORKFLOW_EVENT_TYPES.CHANGE_COMPLETED instead of a raw workflow event type string.",
        },
        {
          selector: "Literal[value='change_created']",
          message:
            "Use WORKFLOW_EVENT_TYPES.CHANGE_CREATED instead of a raw workflow event type string.",
        },
        {
          selector: "Literal[value='change_removed']",
          message:
            "Use WORKFLOW_EVENT_TYPES.CHANGE_REMOVED instead of a raw workflow event type string.",
        },
      ],
    },
  },
  eslintConfigPrettier,
];
