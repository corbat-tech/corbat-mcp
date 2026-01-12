import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        'vitest.config.ts',
        '.dependency-cruiser.cjs',
        'src/index.ts', // Entry point - tested via integration
        'src/cli/**', // CLI - interactive, tested manually
      ],
      thresholds: {
        global: {
          statements: 75,
          branches: 70,
          functions: 60,
          lines: 75,
        },
      },
    },
  },
});
