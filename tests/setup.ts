// Test environment setup
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') })

// Extend test timeout for blockchain operations
if (typeof global !== 'undefined') {
  global.testTimeout = 60000
}

// Global test configuration
export const TEST_CONFIG = {
  timeout: 60000,
  retries: 2,
  parallel: false // Run integration tests sequentially
}