import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: false,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('qrcode')) return 'vendor-qrcode';
            if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            return 'vendor-misc';
          }
          if (id.includes('/src/pages/superadmin/')) return 'portal-super-admin';
          if (id.includes('/src/pages/hospitaladmin/')) return 'portal-hospital-admin';
          if (id.includes('/src/pages/doctor/')) return 'portal-doctor';
          return undefined;
        },
      },
    },
  },
});
