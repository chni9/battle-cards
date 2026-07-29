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
    ],
  },
});
