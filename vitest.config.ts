import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/__mocks__/**', 'src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/types.ts'],
    },
    globals: true,
  },
});
