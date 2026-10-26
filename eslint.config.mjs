import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Technical spec v7 §4.3: src/view-model/ is pure and never reads a clock. */
const VIEW_MODEL_PURITY_MESSAGE =
  'src/view-model/ is pure: no React, react-dom or motion import and no clock read; callers pass nowMs (technical spec v7 §4.3).';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Lives, points, damage and counters get interpolated into log and UI strings
      // constantly. Numbers stringify unambiguously; the rule's real targets
      // (objects, null, undefined) stay forbidden.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['apps/server/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['apps/client/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },

  {
    // One-off Node scripts (art extraction, technical spec v7 §5.5).
    files: ['apps/client/scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['apps/client/src/view-model/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: ['react', 'react-dom', 'motion'].map((name) => ({ name, message: VIEW_MODEL_PURITY_MESSAGE })),
        patterns: [{ group: ['react/*', 'react-dom/*', 'motion/*'], message: VIEW_MODEL_PURITY_MESSAGE }],
      }],
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: VIEW_MODEL_PURITY_MESSAGE },
        { object: 'performance', property: 'now', message: VIEW_MODEL_PURITY_MESSAGE },
      ],
    },
  },
);
