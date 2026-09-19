import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      allowedHosts: true as const,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },

    preview: {
      allowedHosts: true as const,
      host: '0.0.0.0',
      port: 4173,
    },
  };
});