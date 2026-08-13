import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const clientFiles = [
  "App.tsx",
  "index.tsx",
  "{app,components,contexts,hooks,pages,services,shared,utils,miniapp}/**/*.{ts,tsx}",
  "constants.tsx",
  "types.ts",
  "types/**/*.d.ts",
  "vite-env.d.ts",
];

const nodeFiles = [
  "*.{js,mjs,cjs}",
  "server/**/*.{ts,js,mjs,cjs}",
  "cloud/**/*.{ts,js,mjs,cjs}",
  "deployment/**/*.{ts,js,mjs,cjs}",
  "scripts/**/*.{ts,js,mjs,cjs}",
  "*.{config,setup}.{ts,js,mjs,cjs}",
  "proxy-server.mjs",
  "vite.config.ts",
];

const testFiles = [
  "**/*.{test,spec}.{ts,tsx,js,mjs,cjs}",
  "**/tests/**/*.{ts,tsx,js,mjs,cjs}",
];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "dist/**",
      "dist-miniapp/**",
      "coverage/**",
      "temp/**",
      "cache/**",
      ".cache/**",
      ".phase0/**",
      "public/vendor/**",
      "**/*.d.ts",
      "**/*.min.js",
      "**/*.generated.*",
      "**/fixtures/**",
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
  },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-control-regex": "warn",
      "no-empty": "warn",
      "no-regex-spaces": "warn",
      "no-useless-escape": "warn",
      "no-unused-vars": "warn",
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-namespace": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "prefer-const": "warn",
    },
  },
  {
    files: clientFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...Object.fromEntries(
        Object.keys(reactHooks.configs.flat.recommended.rules).map((ruleName) => [
          ruleName,
          "warn",
        ]),
      ),
      "react/no-unknown-property": "warn",
      "react/prop-types": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: nodeFiles,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
        AbortController: "readonly",
        Blob: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        WebSocket: "readonly",
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
      },
    },
  },
);
