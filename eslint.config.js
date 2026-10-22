import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import importX from "eslint-plugin-import-x"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist", ".wrangler", "server/.wrangler"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Canonical style for src: arrows only, named React imports, double quotes,
  // enforced import order (not comment-only).
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      "import-x": importX,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // Arrow functions for components, hooks, helpers, callbacks, handlers.
      // No function declarations or expressions.
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      "prefer-arrow-callback": ["error", { allowNamedFunctions: false }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration",
          message: "Use arrow functions (export const X = () => {...}). No function declarations.",
        },
        {
          selector: "FunctionExpression",
          message: "Use arrow functions (const X = () => {...}). No function expressions.",
        },
        {
          selector: 'MemberExpression[object.name="React"]',
          message: "Import types and hooks by name from \"react\". No React.ReactNode, React.useState, etc.",
        },
      ],
      // React imports — named only. No default React import.
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "react",
            importNames: ["default"],
            message: "Import types and hooks by name from \"react\" (e.g. import { useState } from \"react\"). No default React import.",
          },
        ],
      }],
      quotes: ["error", "double", { avoidEscape: true }],
      "jsx-quotes": ["error", "prefer-double"],
      "import-x/first": "error",
      "import-x/no-duplicates": "error",
      "import-x/newline-after-import": ["error", { count: 1 }],
      // Fixed group order (canonical):
      // 1 React, 2 Next, 3 Libraries, 4 Hooks, 5 Components,
      // App routes below Components, 6 Icons, 7 Utils, 8 Constants,
      // 9 Services, 10 Types, 11 Styles (co-located ./Component.scss only;
      // this repo uses .css — .scss/.sass also sorted last for future).
      // JS + JSDoc: types stay as JSDoc, no TS syntax.
      "simple-import-sort/imports": ["error", {
        groups: [
          ["^react$", "^react-dom"],
          ["^next"],
          [
            "^i18next",
            "^react-i18next",
            "^@tanstack",
            "^next-intl",
            "^(?!@hooks|@components|@icons|@utils|@constants|@services|@types)[^.]",
          ],
          ["^@hooks", "/hooks/"],
          ["^@components", "/components/", "\\./App\\.jsx$", "App\\.jsx$"],
          ["/app/", "^@app", "^\\./[A-Za-z]+Page/"],
          ["^@icons", "/icons/"],
          ["^@utils", "/lib/", "/utils/", "/locales/", "^@lib"],
          ["^@constants", "/constants/"],
          ["^@services/actions", "^@services/fetchers", "^@services", "/services/"],
          ["^@services/dto", "^@types", "/types/", "/dto/"],
          ["\\.css$", "\\.scss$", "\\.sass$"],
        ],
      }],
      "simple-import-sort/exports": "error",
    },
  },
  {
    files: ['server/**/*.js', 'scripts/**/*.mjs', 'vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Atomic layer enforcement: templates → organisms → molecules → atoms.
  // App routes compose templates/organisms only.
  // (Patterns use bare layer segments so relative imports are matched.)
  {
    files: ['src/components/atoms/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/molecules/**', '**/organisms/**', '**/templates/**',       '**/app/**'], message: 'Atoms must not import from higher layers.' },
        ],
      }],
    },
  },
  {
    files: ['src/components/molecules/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/organisms/**', '**/templates/**',       '**/app/**'], message: 'Molecules may import atoms only.' },
        ],
      }],
    },
  },
  {
    files: ['src/components/organisms/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/templates/**',       '**/app/**'], message: 'Organisms may import molecules and atoms only.' },
        ],
      }],
    },
  },
  {
    files: ['src/components/templates/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: [      '**/app/**'], message: 'Templates must not import app routes.' },
        ],
      }],
    },
  },
  // App routes are the top layer: they may use any component layer but must
  // not define new UI primitives (no raw `.primary-button` / `.ghost-button`
  // / `.nav-button` / `.text-input` markup outside shared atoms).
  {
    files: ['src/app/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'JSXAttribute[name.name="className"][value.value=/primary-button|ghost-button|nav-button|text-input/]',
        message: 'Pages must use shared Button/TextInput/SearchBar instead of raw primitive classes.',
      }],
    },
  },
])
