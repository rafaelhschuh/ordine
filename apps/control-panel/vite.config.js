import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8002,
    host: true,
  },
  preview: {
    port: 58002,
    host: true,
  },
});
