import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

// The Agent SDK ships a native engine + spawns a subprocess and resolves that
// engine via import.meta.url — it must stay EXTERNAL (never bundled), then be
// made available in the packaged app's node_modules (forge.config.ts, task 7).
// Array form so Vite's mergeConfig concatenates with Forge's base externals
// instead of dropping a function override.
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'electron',
        'electron-squirrel-startup',
        '@anthropic-ai/claude-agent-sdk',
        /^@anthropic-ai\//,
        /^node:/,
        ...builtinModules,
      ],
    },
  },
});
