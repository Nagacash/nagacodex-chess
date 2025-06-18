import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        // CORRECTED: Changed alias to resolve from the project root ('.')
        // since your index.tsx and likely other source files are now at the root.
        '@': path.resolve(__dirname, '.'),
      }
    },

    build: {
      rollupOptions: {
        // CRITICAL FIX: Changed 'src/index.tsx' to 'index.tsx'
        // as your index.tsx is directly in the project root.
        input: 'index.tsx', 
      },
      outDir: 'dist',
    },

    assetsInclude: [
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.ico',
    ],

    server: {
      host: true,
    },
  };
});
