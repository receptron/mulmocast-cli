import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  {
    files: ["{src,test,samles}/**/*.{js,ts,yaml,yml}"],
  },
  {
    ignores: ["lib"],
  },
  eslint.configs.recommended,
  sonarjs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/utils/markdown.ts'],
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
      "@typescript-eslint/no-explicit-any": "warn",
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
      // "no-plusplus": "warn",
      "no-undef": "warn",
      "prefer-const": "error",
      "no-return-assign": "error",
      "object-shorthand": "error",
      semi: ["error", "always"],
      "prettier/prettier": "error",
      "no-console": "error",
      "sonarjs/redundant-type-aliases": "off",
      "sonarjs/todo-tag": "off",
      "sonarjs/no-commented-code": "off",
      "sonarjs/no-unused-vars": "off",
      "sonarjs/cognitive-complexity": "warn",
    },
    plugins: {
      prettier: prettierPlugin,
    },
  },
  eslintConfigPrettier,
];
