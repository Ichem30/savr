import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  const geminiKey = env.VITE_GEMINI_API_KEY;

  if (!geminiKey) {
    console.warn("VITE_GEMINI_API_KEY is missing in .env file");
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [react()],
    define: {
      // Map the VITE_GEMINI_API_KEY from .env to process.env.API_KEY for the Gemini Service
      'process.env.API_KEY': JSON.stringify(geminiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});