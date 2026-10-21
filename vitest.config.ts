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
          // Vitest blanks every CSS import, `?raw` included, unless css.include matches it.
          // ui/palette.test.ts reads the token source to prove palette.ts mirrors it (L72-05).
          css: { include: [/\/src\/ui\/tokens\.css\?raw$/] },
        },
      },
    ],
  },
});
