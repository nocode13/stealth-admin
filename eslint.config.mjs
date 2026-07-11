import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import boundaries from 'eslint-plugin-boundaries';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';
import effector from 'eslint-plugin-effector';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

// Feature-Sliced Design constants (inlined from @feature-sliced/eslint-config)
const FSD_LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];

const getLowerLayers = (layer) => FSD_LAYERS.slice(FSD_LAYERS.indexOf(layer) + 1);
const getUpperLayers = (layer) => FSD_LAYERS.slice(0, FSD_LAYERS.indexOf(layer));

const layerBoundariesElements = FSD_LAYERS.map((layer) => ({
  type: layer,
  pattern: `${layer}/!(_*){,/*}`,
  capture: ['slices'],
}));

// Layer-root files with no slice subfolder (e.g. `pages/index.ts`, the routes
// aggregator) aren't matched by the pattern above, which requires a slice
// segment — without this, importing them bypassed boundary checks entirely.
const layerRootElements = FSD_LAYERS.map((layer) => ({
  type: layer,
  pattern: layer,
}));

const godModeElements = FSD_LAYERS.map((layer) => ({
  type: `gm_${layer}`,
  pattern: `${layer}/_*`,
  capture: ['slices'],
}));

// v7 `boundaries/dependencies` policies (the legacy `boundaries/element-types` +
// string-based `rules` option silently matched everything as allowed under
// eslint-plugin-boundaries@7 — verified by a temporary cross-layer import that
// went unreported. Native v7 selector/policy syntax is required for the rule
// to actually enforce layering).
const notSharedLayersPolicies = getUpperLayers('shared').map((layer) => ({
  from: { element: { type: layer } },
  allow: { to: { element: { types: { anyOf: getLowerLayers(layer) } } } },
}));

const slicelessLayerPolicies = [
  { from: { element: { type: 'shared' } }, allow: { to: { element: { type: 'shared' } } } },
  { from: { element: { type: 'app' } }, allow: { to: { element: { type: 'app' } } } },
];

const godModePolicies = FSD_LAYERS.map((layer) => ({
  from: { element: { type: `gm_${layer}` } },
  allow: { to: { element: { types: { anyOf: [layer, ...getLowerLayers(layer)] } } } },
}));

// A layer-root file (element `path` equal to the bare layer name, e.g.
// `pages/index.ts`) composes its own layer's slices (routes aggregator,
// widgets barrel, ...), so it's the one exception allowed to import sibling
// slices of the same layer.
const layerRootSelfImportPolicies = FSD_LAYERS.map((layer) => ({
  from: { element: { type: layer, path: layer } },
  allow: { to: { element: { type: layer } } },
}));

export default [
  // Global ignores
  {
    ignores: ['dist/**', '**/*.cjs'],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended
  ...tseslint.configs.recommended,

  // Main project config
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'import-x': importX,
      boundaries,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
        }),
      ],
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      'boundaries/root-path': 'src',
      'boundaries/elements': [...layerBoundariesElements, ...layerRootElements, ...godModeElements],
    },
    rules: {
      // FSD: Layer boundaries
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            '"{{from.type}}" is not allowed to import "{{to.type}}" | See rules: https://feature-sliced.design/docs/reference/layers ',
          policies: [
            ...notSharedLayersPolicies,
            ...slicelessLayerPolicies,
            ...godModePolicies,
            ...layerRootSelfImportPolicies,
          ],
        },
      ],

      // Import ordering
      'import-x/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [['builtin', 'external'], ['internal'], ['sibling', 'parent', 'index']],
          pathGroups: [
            { pattern: '@/pages/**', group: 'internal', position: 'before' },
            { pattern: '@/widgets/**', group: 'internal', position: 'after' },
            { pattern: '@/features/**', group: 'internal', position: 'after' },
            { pattern: '@/entities/**', group: 'internal', position: 'after' },
            { pattern: '@/shared/**', group: 'internal', position: 'after' },
          ],
          distinctGroup: false,
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],

      // Padding lines
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['import', 'cjs-import'], next: '*' },
        { blankLine: 'any', prev: ['import', 'cjs-import'], next: ['import', 'cjs-import'] },
      ],

      // General rules
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-unused-vars': 'off',
      'no-empty': 'warn',
      'no-extra-boolean-cast': 'off',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-interface': 'off',

      // Import rules
      'import-x/no-internal-modules': 'off',
    },
  },

  // React
  {
    files: ['**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    // Pin the version explicitly: react-plugin's 'detect' uses context.getFilename(),
    // which is removed in ESLint 10 and crashes rule loading.
    settings: { react: { version: '19.2' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      // New JSX transform (React 19) — no need to import React in scope
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // Prop types are enforced by TypeScript
      'react/prop-types': 'off',
    },
  },

  // React Hooks
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // React Refresh (Vite preset)
  {
    ...reactRefresh.configs.vite(),
    rules: {
      ...reactRefresh.configs.vite().rules,
      'react-refresh/only-export-components': 'warn',
    },
  },

  // Effector (recommended + React-specific rules).
  // Scoped to src and given type information: several effector rules
  // (naming conventions, no-watch, mandatory-scope-binding, ...) require it.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { effector },
    rules: {
      ...effector.configs.recommended.rules,
      ...effector.configs.react.rules,
      // App renders without a Fork scope in production (Fork is used only in
      // tests), so calling units directly in components is intentional here.
      'effector/mandatory-scope-binding': 'off',
    },
  },

  // Prettier (must be last)
  prettierRecommended,
  {
    rules: {
      'prettier/prettier': 'warn',
    },
  },
];
