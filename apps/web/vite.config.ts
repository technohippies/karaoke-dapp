import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './', // Use relative paths for IPFS compatibility
  server: {
    port: 3000,
    https: false
  },
  define: {
    global: 'globalThis',
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  optimizeDeps: {
    include: ['@lit-protocol/lit-node-client', '@lit-protocol/constants'],
  },
})