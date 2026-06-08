import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

const external = new Set<string>([
  'electron',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

// https://vitejs.dev/config — preload
export default defineConfig({
  build: {
    rollupOptions: {
      external: (id) => external.has(id) || id.startsWith('node:'),
    },
  },
});
