import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, process: true },
      protocolImports: true,
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/report': 'http://localhost:3000',
      '/api/launches': 'http://localhost:3000',
    },
  },
});
