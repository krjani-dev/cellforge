import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

// Library-mode build with explicit subpath entries matching package.json `exports`.
// Heavy addons live in their own entries and are NEVER imported from the core entry —
// see doc/BUNDLE_BUDGET.md for the architectural rules.
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.stories.tsx'],
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'io/xlsx': resolve(__dirname, 'src/io/xlsx/index.ts'),
        'io/csv': resolve(__dirname, 'src/io/csv/index.ts'),
        'io/pdf': resolve(__dirname, 'src/io/pdf/index.ts'),
        'migration/webix': resolve(__dirname, 'src/migration/webix/index.ts'),
        'editors/date': resolve(__dirname, 'src/editors/date/index.ts'),
        'locales/fr': resolve(__dirname, 'src/locales/fr/index.ts'),
      },
      formats: ['es'],
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-window',
        'zustand',
        'zustand/react/shallow',
        'zustand/vanilla',
        '@radix-ui/react-context-menu',
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'styles.css';
          return 'assets/[name][extname]';
        },
      },
    },
    target: 'es2022',
    minify: 'esbuild',
  },
});
