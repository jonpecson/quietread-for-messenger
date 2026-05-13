import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content/messenger-content': resolve(__dirname, 'src/content/messenger-content.ts'),
        'injected/fetch-xhr-hook': resolve(__dirname, 'src/injected/fetch-xhr-hook.ts'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.html'),
        'options/options': resolve(__dirname, 'src/options/options.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
    target: 'chrome120',
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    {
      name: 'fix-extension-html',
      closeBundle() {
        // Vite outputs HTML under dist/src/{popup,options}/ because inputs are under src/.
        // The manifest expects popup/popup.html and options/options.html relative to dist/.
        // Copy and fix relative paths so they resolve from one level deep instead of two.
        const pages = ['popup', 'options'];
        for (const page of pages) {
          const src = resolve(__dirname, `dist/src/${page}/${page}.html`);
          const dest = resolve(__dirname, `dist/${page}/${page}.html`);
          try {
            mkdirSync(resolve(dest, '..'), { recursive: true });
            let html = readFileSync(src, 'utf-8');
            // Fix paths: from ../../X to ../X (one less level)
            html = html.replace(/(?:src|href)="\.\.\/\.\.\//g, (match) =>
              match.replace('../../', '../')
            );
            writeFileSync(dest, html, 'utf-8');
          } catch (e) {
            console.warn(`[fix-extension-html] Could not process ${page}:`, e);
          }
        }
      },
    },
  ],
});
