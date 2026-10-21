import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

// the renderer is loaded from disk by electron, so every asset path has to be relative
export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
    outDir: '../../dist-renderer',
    emptyOutDir: true
  },
  resolve: {
    // the shared ui package reaches for its helpers through the app's own alias
    alias: [
      {
        find: '@/lib/utils',
        replacement: path.resolve(
          __dirname,
          '../../packages/ui/src/lib/utils.ts'
        )
      },
      { find: '@', replacement: path.resolve(__dirname, './src/renderer') }
    ]
  }
});
