import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3009,
    host: '0.0.0.0', // 监听所有网络接口，支持IPv4和IPv6
    strictPort: true, // 如果端口被占用，不自动切换端口
  },
});