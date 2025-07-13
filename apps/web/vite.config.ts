import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
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