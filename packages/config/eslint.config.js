/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    // TypeScript
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "inline-type-imports" },
    ],
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/explicit-function-return-type": "off",

    // General
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-template": "error",
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".next/",
    "*.config.js",
    "*.config.ts",
  ],
};
