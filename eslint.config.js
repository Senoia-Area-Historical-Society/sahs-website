import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Build output and local scratch directories are not source.
  //
  // `.claude/worktrees/` is the load-bearing one: it holds *nested checkouts of
  // this same repository*, so without this entry ESLint walks every worktree and
  // reports the same finding once per checkout. That inflated the count roughly
  // fivefold (357 reported vs 69 real) and made `npm run lint` useless locally,
  // since the output was mostly duplicates of other branches' code.
  globalIgnores([
    'dist',
    'coverage',
    'functions/lib',      // tsc output for the functions package
    'emulator-data',      // Firebase emulator import/export snapshots
    '.claude/worktrees',  // nested git worktrees — see above
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Warn, don't error. There are ~60 pre-existing `any`s, mostly in page
      // components and test fixtures. They are real type-safety debt worth
      // paying down, but they are not defects, and gating CI on them would mean
      // the check is born red and gets ignored — the usual way a lint gate dies.
      // Keeping them visible as warnings lets the gate block genuine problems
      // (unused variables, bad imports, hook violations) starting today.
      // Removing this line once the count reaches zero is the goal.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
])
