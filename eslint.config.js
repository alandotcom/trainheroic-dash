import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import json from "@eslint/json";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import path from "node:path";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    ...js.configs.recommended,
    languageOptions: { globals: globals.browser },
  },
  {
    name: "prettier",
    rules: prettier.rules,
  },
  {
    ...tseslint.configs.strictTypeChecked[0],
    languageOptions: {
      ...tseslint.configs.strictTypeChecked[0].languageOptions,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: path.resolve(),
      },
    },
  },
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "detect",
        runtime: "automatic",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.jsonc"],
    plugins: { json },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.json5"],
    plugins: { json },
    language: "json/json5",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
  },
]);
