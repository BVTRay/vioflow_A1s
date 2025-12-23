import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3009,
    host: '0.0.0.0', // 监听所有网络接口，支持IPv4和IPv6
    strictPort: true, // 如果端口被占用，不自动切换端口
    allowedHosts: ['a1.prizum.me'], // 允许通过 Cloudflare Tunnel 访问的域名
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});