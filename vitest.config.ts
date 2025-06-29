import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use new projects API instead of deprecated workspace
    projects: [
      {
        test: { 
          name: 'Integration',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: 60000, // Long timeout for blockchain calls
          hookTimeout: 30000,
          globals: true,
          environment: 'node',
          setupFiles: ['tests/setup.ts'],
          // Run integration tests sequentially to avoid conflicts
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true
            }
          }
        }
      },
      {
        test: {
          name: 'Unit', 
          include: ['tests/unit/**/*.test.ts'],
          testTimeout: 10000,
          globals: true,
          environment: 'node'
        }
      },
      {
        test: {
          name: 'Browser',
          include: ['tests/browser/**/*.test.ts'],
          testTimeout: 10000,
          globals: true,
          environment: 'jsdom',
          setupFiles: ['tests/browser-setup.ts']
        }
      }
    ]
  }
})