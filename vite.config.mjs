import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  root: path.resolve(__dirname, 'src/svelte'),
  publicDir: false,
  plugins: [svelte()],
  build: {
    outDir: path.resolve(__dirname, 'src/view'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/svelte/index.html'),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
