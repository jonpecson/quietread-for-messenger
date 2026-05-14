import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { build } from 'vite';

// Main config builds popup/options HTML pages (ES module format is fine for these)
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
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
      name: 'build-extension-scripts',
      async closeBundle() {
        // Fix HTML paths (Vite nests under dist/src/)
        for (const page of ['popup', 'options']) {
          const src = resolve(__dirname, `dist/src/${page}/${page}.html`);
          const dest = resolve(__dirname, `dist/${page}/${page}.html`);
          try {
            mkdirSync(resolve(dest, '..'), { recursive: true });
            let html = readFileSync(src, 'utf-8');
            html = html.replace(/(?:src|href)="\.\.\/\.\.\//g, (m) => m.replace('../../', '../'));
            writeFileSync(dest, html, 'utf-8');
          } catch {
            // already in place
          }
        }

        // Build IIFE bundles for content script, service worker, and injected hook
        const iifeEntries = [
          { name: 'content/messenger-content', entry: 'src/content/messenger-content.ts' },
          { name: 'background/service-worker', entry: 'src/background/service-worker.ts' },
          { name: 'injected/fetch-xhr-hook', entry: 'src/injected/fetch-xhr-hook.ts' },
        ];

        for (const { name, entry } of iifeEntries) {
          await build({
            configFile: false,
            build: {
              outDir: 'dist',
              emptyOutDir: false,
              lib: {
                entry: resolve(__dirname, entry),
                name: name.replace(/[/-]/g, '_'),
                formats: ['iife'],
                fileName: () => `${name}.js`,
              },
              rollupOptions: {
                output: {
                  inlineDynamicImports: true,
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
            logLevel: 'warn',
          });
        }
      },
    },
  ],
});
