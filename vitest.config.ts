import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**/src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'packages/**/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
        'packages/**/src/**/__tests__/**',
        'packages/**/dist/**',
      ],
    },
  },
})
