import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Fairscape Packager',
    // The Agent SDK ships a native engine binary + spawns a subprocess, so it can't run
    // from inside the asar archive. The OpenCode SDK is ESM and spawns `opencode serve`.
    // Unpack both package trees so they load/execute correctly outside the archive.
    // (NOTE: the Forge+Vite plugin currently prunes node_modules from the package entirely,
    // so shipping the externalized SDK *JS* is still open work — see README "Remaining".)
    asar: {
      unpack: '**/node_modules/{@anthropic-ai,@opencode-ai}/**',
    },
    // Bundle the OpenCode CLI so end users install nothing. The `opencode-ai` postinstall
    // vendors this platform's native binary into opencode-ai/bin/opencode.exe (that name is
    // used on every OS); we ship that single self-contained file straight into the app's
    // resources/ dir, which sidesteps node_modules pruning. opencode-binary.ts resolves it at
    // `process.resourcesPath/opencode.exe` and puts it on PATH for the SDK.
    //
    // Ship the vendored wizard skills too: `./skills` lands at
    // `process.resourcesPath/skills`, which is what skillsSourceDir() reads in
    // packaged builds (end-user machines have no fairscape_grader sibling).
    //
    // Ship the self-contained Python: `./prebuilt/pyenv` lands at
    // `process.resourcesPath/pyenv`, which python-env.ts's bundledRoot() resolves so the
    // Setup Gate auto-skips (end users install no Python). Built per-platform by
    // scripts/fetch-python.mjs (see the generateAssets hook below).
    extraResource: ['./node_modules/opencode-ai/bin/opencode.exe', './skills', './prebuilt/pyenv'],
  },
  rebuildConfig: {},
  hooks: {
    // Build the bundled Python for THIS platform before packaging, if it isn't there yet.
    // Runs natively on each CI runner (linux/macOS), so each artifact gets its own pyenv.
    generateAssets: async () => {
      const pyenv = path.resolve(__dirname, 'prebuilt', 'pyenv');
      if (existsSync(pyenv)) return;
      console.log('[forge] building bundled Python (scripts/fetch-python.mjs) …');
      execFileSync('node', [path.resolve(__dirname, 'scripts', 'fetch-python.mjs')], {
        stdio: 'inherit',
      });
    },
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
