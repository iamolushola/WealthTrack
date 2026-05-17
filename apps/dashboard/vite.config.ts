import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
    },
    define: {
      __APP_API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1'),
    },
  };
});