import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,  
    environment: 'node',         // бэкенд работает в Node.js
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/**/*.{unit,feature}.test.ts',
        'src/**/*.spec.ts',
      ],
    },
  },
});