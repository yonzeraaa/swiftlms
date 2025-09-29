import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
    globals: true,
    exclude: ['neovim/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    }
  }
})
