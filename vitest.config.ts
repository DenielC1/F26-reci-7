import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['scripts/runner-setup.ts'],
    testTimeout: 30_000,
  },
});
