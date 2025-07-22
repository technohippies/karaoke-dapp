import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
  },
  optimizeDeps: {
    include: ['@lit-protocol/lit-node-client', '@lit-protocol/constants'],
  },
})