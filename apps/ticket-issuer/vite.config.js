import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do arquivo .env na raiz do projeto
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  
  return {
    plugins: [vue()],
    envDir: path.resolve(__dirname, '../..'),
    server: {
      port: Number(env.VITE_ISSUER_PORT) || 8003,
      host: env.VITE_HOST || '0.0.0.0',
    },
    preview: {
      port: 58003,
      host: env.VITE_HOST || '0.0.0.0',
    },
  };
});
