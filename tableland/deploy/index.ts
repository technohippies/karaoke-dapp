#!/usr/bin/env bun
/**
 * Main deployment entry point
 * Redirects to the unified deployment tool
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const unifiedDeployPath = join(__dirname, 'unified-deploy.ts')

// Pass through all arguments to unified-deploy.ts
const child = spawn('bun', ['run', unifiedDeployPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
})

child.on('exit', (code) => {
  process.exit(code || 0)
})