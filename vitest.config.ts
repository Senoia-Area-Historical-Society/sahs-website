/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Unit tests only. `e2e/` holds Playwright specs, which use a `test` fixture
    // API Vitest cannot run — without this scope its default glob picks them up
    // and they always report as failing test files. Run those with `npm run test:e2e`.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
