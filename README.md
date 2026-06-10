# FAIRSCAPE Studio

A desktop GUI that **drives the agentic FAIRSCAPE RO-Crate wizard** with Claude and visually
walks you through its phases. It does not reimplement the wizard — it embeds Claude (the Agent
SDK) and runs the existing `fairscape_grader` skills unchanged, observing them via the
`.fairscape-state.json` phase file + the streamed tool/assistant events, and answering their
questions through native UI.

- **Default flow:** pick a project folder → Claude runs Import → Schemas → AI-Ready → Provenance →
  Grading → Improvements, asking you questions (rendered as option cards) and requesting tool
  permission (writes/bash) as it goes.
- **Auth:** runs on your existing Claude subscription login — **no API key**. (The app strips
  `ANTHROPIC_API_KEY` from the engine's environment so it can't fall through to per-token billing.)

## Stack

Electron Forge + Vite + React 19 + TypeScript + Tailwind v4. Secure renderer
(`contextIsolation`, no `nodeIntegration`); all privileged work happens in the main process and is
reached only through the typed `contextBridge` (`window.fairscape`).

```
src/
  main.ts                 secure BrowserWindow + lifecycle
  preload.ts              typed contextBridge -> window.fairscape
  shared/types.ts         IPC contract (channels, events, FairscapeApi)
  shared/phases.ts        the 6 phases + state.phase -> stepper mapping
  main/
    bridge.ts             WizardSession: query() stream <-> renderer; canUseTool routing
    ipc.ts                ipcMain handlers
    state-watcher.ts      fs.watch .fairscape-state.json (authoritative phase)
    auth.ts               strip API keys, login check, error classification
    skills.ts / config.ts make the fairscape_grader skills discoverable to the session
  hooks/useWizard.ts      renderer brain (subscribes to IPC streams)
  components/             PhaseStepper, ActivityFeed, QuestionCard, PermissionDialog
  App.tsx                 shell: landing -> live wizard
```

## Run (development)

```bash
npm install
npm start
```

Prerequisites:
- **Claude Code installed and logged in** (`claude` on PATH, a Pro/Max/Team/Enterprise login) —
  for the default **Claude** engine.
- The **OpenCode** engine needs **no separate install**: the `opencode` binary is bundled via the
  `opencode-ai` dependency (its postinstall vendors this platform's native executable into
  `node_modules/opencode-ai/bin/opencode.exe`). At runtime `src/main/opencode-binary.ts` puts it on
  PATH for the SDK; users only supply a provider key (Settings) or `opencode auth login`.
- **The wizard's Python deps** so `preflight-check` passes — from this monorepo:
  `pip install -e ../fairscape_grader` (provides `fairscape_wizard`; `fairscape-cli` and
  `fairscape_models` are also required). If missing, the wizard detects it and offers `env-setup`.
- The fairscape_grader skills are auto-located (sibling repo in dev; override with
  `FAIRSCAPE_SKILLS_DIR`). On first wizard start the app links them into `<project>/.claude/skills`.

## Status

Done: SDK wiring spike (validated), app scaffold, main-process bridge (SDK correctly externalized),
interactive shell (stepper + live feed + AskUserQuestion option cards + permission dialog).

Remaining: full `<GradingView>` (port of `ai-ready-score-view.html`); polish (resume, login-missing
/ credit-exhausted states, branding); distribution packaging — Forge+Vite prunes `node_modules`, so
the external Agent SDK must be copied into the packaged app (dev `npm start` is unaffected). The
bundled `opencode` binary rides the same path: `forge.config.ts` unpacks `opencode-ai`/`opencode-*`
out of the asar archive so it stays executable. (Optional size trim: the `opencode-<platform>`
source package duplicates the vendored binary — it can be excluded from the package since runtime
only uses `opencode-ai/bin`.)
