import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          root: './packages/shared',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'server',
          root: './apps/server',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        // Vite asset pipeline so `import.meta.glob(...?url)` resolves PNGs (L10-03).
        extends: './apps/client/vite.config.ts',
        test: {
          name: 'client',
          root: './apps/client',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
    ],
  },
});
