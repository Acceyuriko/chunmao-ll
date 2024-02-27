const OFF = "off";
const ERROR = "error";

module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: ".",
    projects: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "prettier", "simple-import-sort"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  root: true,
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/no-non-null-assertion": OFF,
    "@typescript-eslint/no-unused-vars": [ERROR, { args: "after-used" }],
    "simple-import-sort/imports": ERROR,
    "simple-import-sort/exports": ERROR,
  },
  env: {
    node: true,
    browser: true,
  },
};
