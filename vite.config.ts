import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/data': 'http://localhost:8083',
      '/api': 'http://localhost:8083',
      '/save-collected-data': 'http://localhost:8083',
      '/update-game-ids': 'http://localhost:8083',
      '/files': 'http://localhost:8083',
      '/active-file': 'http://localhost:8083',
      '/config': 'http://localhost:8083',
      '/update-message': 'http://localhost:8083',
      '/message': 'http://localhost:8083',
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

