# Bundling Python (item 3) — IMPLEMENTED

**Goal:** end users install *nothing*. The wizard's Python (interpreter + `fairscape-wizard`,
`fairscape-cli`, `fairscape_models`) ships inside the app. The Setup Gate from steps 1–2 then
degrades from a *multi-minute install* to a *~2-second verify* — and stays only as a fallback for
dev machines, a corrupted bundle, or a platform with no prebuilt artifact.

This builds directly on the pattern `forge.config.ts` already uses for the `opencode` binary and the
`skills/` dir: build-time artifact → `extraResource` → `process.resourcesPath` at runtime.

**Status (Linux verified):** `scripts/fetch-python.mjs` produces `prebuilt/pyenv` (~510 MB on
linux-x64); imports + `fairscape-cli` verified, and verified still working after copying to a
different path (relocatable). `python-env.ts` resolves it first, so the gate auto-skips.
`forge.config.ts` ships it via `extraResource` + a `generateAssets` hook that builds it if missing.
`.github/workflows/build.yml` builds linux + macOS (arm64/x64) natively. **Remaining: macOS
signing/notarization, and a first packaged-app smoke test on a clean machine.**

---

## The one design constraint that picks the approach

The agent doesn't call our code — it runs **bash that calls `python3` and `fairscape-cli` directly**
(the wizard skills do `python3 -c ...`, `fairscape-cli rocrate ...`). So we cannot freeze the Python
side into a single PyInstaller/PyOxidizer executable: that gives *one* entrypoint, not a general
`python3` + `fairscape-cli` on PATH.

➡️ **Ship a relocatable CPython with the wheels pre-installed, and put its `bin/` on PATH.** Then
`python3` and `fairscape-cli` resolve to the bundled copies exactly as they do for a local venv
today. This is the same mechanism `applyPythonEnvToPath()` already implements — we just point it at a
read-only bundled dir instead of the userData venv.

## What gets bundled

1. **A relocatable interpreter** — [`python-build-standalone`](https://github.com/astral-sh/python-build-standalone)
   (the builds `uv` itself uses). One tarball per OS/arch.
2. **The wheels, pre-installed** — `fairscape-wizard` (+ its deps) installed into that interpreter at
   build time, so nothing is fetched on the user's machine.
3. **(Already half-done)** the `uv` binary — `uvBin()` in `python-env.ts` already looks for
   `process.resourcesPath/uv`; bundling uv makes the *fallback* install fast too.

## Where it lives (as built)

| Piece | Location |
|---|---|
| Build script | `scripts/fetch-python.mjs` — `npm run build:python` |
| Build artifact | `prebuilt/pyenv/` (gitignored; one per checkout, built natively per OS) |
| Ship it | `forge.config.ts` → `extraResource: [… , './prebuilt/pyenv']` |
| Auto-build | `forge.config.ts` `hooks.generateAssets` builds it if missing before packaging |
| Runtime path | `process.resourcesPath/pyenv` (packaged), `<app>/prebuilt/pyenv` (dev), or `FAIRSCAPE_PYENV` |
| Resolver | `bundledRoot()` / `activeBinDir()` / `activePython()` / `activeCliPath()` in `python-env.ts` |
| Per-OS build | `.github/workflows/build.yml` — ubuntu + macos-14 (arm64) + macos-13 (x64) |

## Runtime resolution (as built)

`python-env.ts` resolves **bundled → managed userData venv → system**. `activePython()`,
`activeBinDir()`, `activeCliPath()` key off `bundledRoot()`; `applyPythonEnvToPath()` (called at
startup in `main.ts`) puts the bundled `bin/` first on PATH so the agent's `python3` /
`fairscape-cli` resolve to it. With a bundle present `checkPythonEnv()` returns `ok` on first launch
→ `App.tsx` skips the Setup Gate. Nothing else changes.

## How the build script works (and two gotchas it solves)

`scripts/fetch-python.mjs`, run natively per platform:

1. Resolve the latest `python-build-standalone` **`install_only_stripped`** asset for the host triple
   (falls back to `install_only`). Download + extract to `prebuilt/pyenv`.
   - **Gotcha 1 — don't strip it yourself.** The plain `install_only` libpython is unstripped (~200 MB
     of DWARF), but running GNU `strip` on it corrupts `.gnu.version_d` and the interpreter dies with
     `no version information available` / `undefined symbol: , version`. PBS's `install_only_stripped`
     variant is stripped correctly (versioning intact) — use it.
2. Install the wheels into the interpreter's **own** site-packages (`python3 -m pip install
   fairscape-wizard`, or `--local` to install the working-tree sibling repos). Not a venv — venvs
   hardcode absolute paths in `pyvenv.cfg`/shebangs and break when relocated.
3. **Make it relocatable:** rewrite the absolute build-time shebangs of the console scripts in `bin/`
   (e.g. `fairscape-cli`) to `#!/usr/bin/env python3`. Since we put `bin/` first on PATH at runtime,
   `env python3` finds the bundled interpreter wherever the app is installed. (Verified by copying the
   bundle to a different path and re-running.)
4. Prune unused stdlib (`test`, `idlelib`, `tkinter`, `lib2to3`, `turtledemo`, `__pycache__`).
   - **Gotcha 2 — pyarrow/pandas are NOT optional.** preflight calls pandas+pyarrow a non-blocking
     *warning*, but `fairscape-cli` eagerly `import pyarrow.parquet` at module load, so pruning them
     breaks the CLI entirely. They stay in.

## Size, and how to trim it

~**510 MB** on linux-x64 (pyarrow ≈ 150 MB, pandas/numpy ≈ 100 MB, and the pydantic-ai provider-SDK
tail — openai/anthropic/google-genai/huggingface/fastmcp/logfire/opentelemetry — pulled in by
`fairscape-wizard`). Biggest available win, **owned by `fairscape_grader` not this repo:** make the
LLM-grader deps (`pydantic-ai` + provider SDKs) an optional extra and lazy-import them inside
`rubric_eval`, since in Studio the LLM work is done by the Agent SDK, not in-process Python. If
`from fairscape_wizard import rubric_eval` no longer drags in that tree, the bundle drops by a few
hundred MB. (Not done here — it requires changing the grader's packaging.)

## Costs / gotchas still to budget for

- **macOS signing/notarization** — the bundled `.dylib`s + console-script binaries must be signed
  under the hardened runtime or Gatekeeper blocks launch. Add `osxSign`/`osxNotarize` to
  `forge.config.ts` + secrets in CI. The single most fiddly part; the CI workflow notes where.
- **App size** — installer grows by ~510 MB/platform until the trim above lands.
- **Updating deps** — bumping `fairscape-wizard` now means a new app release. Mitigation: the
  userData-venv path from steps 1–2 still works as an "update Python deps" overlay.
- **Windows** — not built yet (PBS layout is `python.exe` + `Scripts/`, not `bin/`); the resolver
  already branches on `isWin` for the managed venv, but the bundled path + script would need the
  Windows triple + layout added.

## Sequencing

1. `scripts/fetch-python.mjs` for **one** platform (your dev OS); prove the `--target` + `PYTHONPATH`
   layout runs the wizard end-to-end.
2. Add `bundledVenvBin()` resolution to `python-env.ts`; confirm the Setup Gate auto-skips.
3. Wire `extraResource` + the `prepackage` hook; `electron-forge make`; test the packaged app on a
   clean machine/VM.
4. Generalize to the CI matrix; add macOS signing.

Steps 1–2 here are ~a day and give you the "installs nothing" demo locally. Steps 3–4 are the real
packaging/CI investment.
