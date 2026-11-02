import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  test: {
    root: './',
    include: ['src/**/*.spec.ts'],
    env: { LOG_LEVEL: 'silent' },
    testTimeout: 20_000,
    hookTimeout: 20_000
  }
});
