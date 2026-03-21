import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import sonarjs from "eslint-plugin-sonarjs";
import importPlugin from "eslint-plugin-import";

export default [
  {
    files: ["{src,test}/**/*.{js,ts,yaml,yml}", "assets/html/js/**/*.js"],
  },
  {
    ignores: ["lib"],
  },
  eslint.configs.recommended,
  sonarjs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/utils/html_render.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      indent: ["error", 2],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^__",
          varsIgnorePattern: "^__",
          caughtErrorsIgnorePattern: "^__",
        },
      ],
      "linebreak-style": ["error", "unix"],
      quotes: "off",
      "no-shadow": "error",
      "no-param-reassign": "error",
      // "no-plusplus": "error",
      "preserve-caught-error": "off",
      "no-undef": "error",
      "prefer-const": "error",
      "no-return-assign": "error",
      "object-shorthand": "error",
      semi: ["error", "always"],
      "prettier/prettier": "error",
      "no-console": "error",
      "import/no-cycle": "error",
      "sonarjs/no-ignored-exceptions": "error",
      "sonarjs/redundant-type-aliases": "off",
      "sonarjs/todo-tag": "off",
      "sonarjs/no-commented-code": "off",
      "sonarjs/no-unused-vars": "off",
      "sonarjs/cognitive-complexity": "warn",
    },
    plugins: {
      prettier: prettierPlugin,
      import: importPlugin,
    },
  },
  // Browser JS runtime files — syntax + basic checks (no TypeScript rules)
  // Top-level `var` is required for vm.runInContext compatibility in tests.
  {
    files: ["assets/html/js/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      sourceType: "script",
    },
    rules: {
      "no-undef": "off",
      "no-var": "off",
      "prefer-const": "off",
      "no-console": "off",
      "no-param-reassign": "off",
      "no-prototype-builtins": "off",
      "object-shorthand": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-this-alias": "off",
      "sonarjs/no-nested-conditional": "off",
      "sonarjs/cognitive-complexity": "off",
    },
  },
  eslintConfigPrettier,
];
