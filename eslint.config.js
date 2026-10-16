import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "apps/web/public/**",
    ],
  },
  {
    files: [
      "scripts/**/*.mjs",
      "eslint.config.js",
      "playwright.config.ts",
      "vitest.config.ts",
      ".dependency-cruiser.cjs",
    ],
    languageOptions: {
      globals: {
        AbortController: "readonly",
        console: "readonly",
        fetch: "readonly",
        module: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        TextDecoder: "readonly",
        URL: "readonly",
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { react, "react-hooks": hooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "The engine does not perform IO." },
        { name: "window", message: "The engine does not read the browser." },
        { name: "document", message: "The engine does not read the browser." },
        { name: "localStorage", message: "The engine does not read the browser." },
      ],
      "no-restricted-imports": ["error", "react", "react-dom"],
    },
  },
  {
    files: ["**/*.{ts,tsx,mjs}"],
    ignores: ["**/*.test.ts", "**/*.test.mjs"],
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  prettier,
);
