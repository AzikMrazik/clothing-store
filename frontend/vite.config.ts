import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, ''),
  build: {
    outDir: 'dist'
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    allowedHosts: [
      '213d-2a12-5940-9ddd-00-2.ngrok-free.app',
      'localhost',
      '127.0.0.1',
      '.ngrok.io',
      '.ngrok-free.app'
    ],
    hmr: {
      clientPort: 443,
      protocol: 'wss',
      host: '213d-2a12-5940-9ddd-00-2.ngrok-free.app'
    }
  }
});
