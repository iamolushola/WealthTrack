import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');
  const allowedHosts = [
    'unjolly-unmisguidedly-glennis.ngrok-free.dev',
    ...(env.VITE_ALLOWED_HOSTS?.split(',').map((host) => host.trim()).filter(Boolean) ?? []),
  ];

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      allowedHosts,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
    },
    define: {
      __APP_API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL ?? '/api/v1'),
    },
  };
});
