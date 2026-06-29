// Native Python environment bootstrap for the wizard's Python deps
// (fairscape_models, fairscape_cli, fairscape_wizard) and the fairscape-cli binary.
//
// This is the deterministic replacement for the LLM-driven preflight-check / env-setup
// skills: setup is a scriptable operation, so it runs here in the main process instead
// of through the agent. The SetupGate UI calls checkPythonEnv() to render a requirement
// checklist and installPythonEnv() to fix it with streamed progress. Once the managed
// venv exists, applyPythonEnvToPath() puts it first on PATH so the agent's `python3` and
// `fairscape-cli` resolve to it — which means the agent's own preflight-check passes
// instantly and env-setup never has to trigger for end users.
import { app } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execFile, execFileSync, spawn } from 'node:child_process';

const isWin = process.platform === 'win32';

/** The package the wizard imports, plus the import symbol each check verifies. */
export interface PythonCheck {
  name: string;
  ok: boolean;
  detail: string;
  blocker: boolean;
}

export interface PythonEnvStatus {
  /** Single pass/fail signal — true when every blocker check passes. */
  ok: boolean;
  /** The interpreter we probed (managed venv if present, else system python). */
  python: string | null;
  pythonVersion: string | null;
  /** True once the app-managed venv exists (vs. checking bare system Python). */
  managed: boolean;
  checks: PythonCheck[];
}

export type InstallMode = 'pypi' | 'editable';

/** What the SetupGate needs to decide which install paths to offer. */
export interface InstallContext {
  hasSystemPython: boolean;
  systemPythonVersion: string | null;
  hasUv: boolean;
  /** Sibling fairscape repos found on disk (dev machines) — enables the editable path. */
  siblingRepos: Partial<Record<'fairscape_models' | 'fairscape-cli' | 'fairscape_grader', string>>;
}

/** Line of install output streamed to the renderer. `stream` is 'out' | 'err' | 'info'. */
export interface SetupLogLine {
  stream: 'out' | 'err' | 'info';
  text: string;
}

// --- Managed virtualenv locations ------------------------------------------------

/** The app-managed venv lives in userData so it survives reinstalls and is per-user. */
function venvDir(): string {
  return path.join(app.getPath('userData'), 'pyenv');
}

/** Directory holding the venv's executables (bin on posix, Scripts on Windows). */
export function managedVenvBin(): string {
  return path.join(venvDir(), isWin ? 'Scripts' : 'bin');
}

/** Path to the managed venv's python, or null if the venv hasn't been created yet. */
function managedPython(): string | null {
  const p = path.join(managedVenvBin(), isWin ? 'python.exe' : 'python');
  return fs.existsSync(p) ? p : null;
}

/** Path to the managed venv's fairscape-cli, or null if not present. */
export function managedCliPath(): string | null {
  const p = path.join(managedVenvBin(), isWin ? 'fairscape-cli.exe' : 'fairscape-cli');
  return fs.existsSync(p) ? p : null;
}

// --- Bundled interpreter (shipped inside the app — see scripts/fetch-python.mjs) ---------

/**
 * Root of the self-contained Python shipped with the app, or null if not bundled.
 * Packaged builds get it from resources/ (forge `extraResource`); in dev it's the
 * prebuilt/ output of `npm run build:python`. Override with FAIRSCAPE_PYENV.
 */
function bundledRoot(): string | null {
  const candidates = [
    process.env.FAIRSCAPE_PYENV,
    app.isPackaged ? path.join(process.resourcesPath, 'pyenv') : undefined,
    path.join(app.getAppPath(), 'prebuilt', 'pyenv'),
  ].filter(Boolean) as string[];
  return candidates.find((c) => exists(path.join(c, 'bin'))) ?? null;
}

/** Bin dir of the bundled interpreter (PBS uses bin/ on Linux & macOS). */
function bundledBin(): string | null {
  const root = bundledRoot();
  return root ? path.join(root, 'bin') : null;
}

function bundledPython(): string | null {
  const bin = bundledBin();
  if (!bin) return null;
  for (const name of ['python3', 'python']) {
    const p = path.join(bin, name);
    if (exists(p)) return p;
  }
  return null;
}

function bundledCliPath(): string | null {
  const bin = bundledBin();
  if (!bin) return null;
  const p = path.join(bin, 'fairscape-cli');
  return exists(p) ? p : null;
}

// --- Active resolution: bundled → managed venv → system ---------------------------------

/** The interpreter the wizard should run on. */
function activePython(): string | null {
  return bundledPython() ?? managedPython() ?? systemPython();
}

/** The bin dir to put first on PATH (bundled or managed venv), or null for bare system. */
export function activeBinDir(): string | null {
  if (bundledBin()) return bundledBin();
  return managedPython() ? managedVenvBin() : null;
}

/** The fairscape-cli the app should invoke (bundled or managed venv), or null. */
export function activeCliPath(): string | null {
  return bundledCliPath() ?? managedCliPath();
}

// --- Tool resolution -------------------------------------------------------------

function exists(p: string | undefined | null): p is string {
  return !!p && fs.existsSync(p);
}

/** First existing match of a binary across PATH and a few well-known locations. */
function whichSync(bin: string): string | null {
  const exe = isWin ? `${bin}.exe` : bin;
  const dirs = (process.env.PATH ?? '').split(path.delimiter);
  // ~/.local/bin and /usr/local/bin aren't always on a packaged Electron's thin PATH.
  dirs.push(path.join(os.homedir(), '.local', 'bin'), '/usr/local/bin');
  for (const d of dirs) {
    if (!d) continue;
    const candidate = path.join(d, exe);
    if (exists(candidate)) return candidate;
  }
  return null;
}

/** A usable system Python (>=3.x), or null. Prefers python3. */
function systemPython(): string | null {
  return whichSync('python3') ?? whichSync('python');
}

/**
 * The uv binary, if available — the fast installer we prefer over pip.
 * Honors FAIRSCAPE_UV, then a bundled copy in resources/ (packaged builds — see the
 * bundling plan), then PATH.
 */
export function uvBin(): string | null {
  if (exists(process.env.FAIRSCAPE_UV)) return process.env.FAIRSCAPE_UV as string;
  const bundled = path.join(process.resourcesPath ?? '', isWin ? 'uv.exe' : 'uv');
  if (exists(bundled)) return bundled;
  return whichSync('uv');
}

// --- Sibling-repo detection (dev / editable installs) ----------------------------

/**
 * Look for the three fairscape repos that enable an editable (dev) install. In dev the
 * app root is `<monorepo>/fairscape-studio`, so the repos are its siblings — we check the
 * parent of the app root (and of cwd) for each one.
 */
function detectSiblingRepos(): InstallContext['siblingRepos'] {
  const names = ['fairscape_models', 'fairscape-cli', 'fairscape_grader'] as const;
  const bases = [path.dirname(app.getAppPath()), path.dirname(process.cwd())];
  const found: InstallContext['siblingRepos'] = {};
  for (const base of bases) {
    for (const name of names) {
      if (found[name]) continue;
      const repo = path.join(base, name);
      if (exists(path.join(repo, 'pyproject.toml'))) found[name] = repo;
    }
  }
  return found;
}

export function detectInstallContext(): InstallContext {
  const py = systemPython();
  return {
    hasSystemPython: !!py,
    systemPythonVersion: py ? probeVersion(py) : null,
    hasUv: !!uvBin(),
    siblingRepos: detectSiblingRepos(),
  };
}

// --- Environment check (lifted from the preflight-check skill) --------------------

/** Synchronous version probe — cheap, used for the install-context summary. */
function probeVersion(python: string): string | null {
  try {
    const out = execFileSync(python, ['-c', 'import sys;print(".".join(map(str,sys.version_info[:3])))'], {
      encoding: 'utf8',
      timeout: 10_000,
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

/** The probe script — one Python process reports version + the three imports as JSON. */
const PROBE = `
import json, shutil, sys
out = {"version": ".".join(map(str, sys.version_info[:3])),
       "py_ok": sys.version_info >= (3, 10),
       "cli": shutil.which("fairscape-cli"),
       "imports": {}}
for mod in ("fairscape_models", "fairscape_cli", "fairscape_wizard"):
    try:
        __import__(mod)
        out["imports"][mod] = True
    except Exception as e:
        out["imports"][mod] = f"{type(e).__name__}: {e}"
print(json.dumps(out))
`;

interface ProbeResult {
  version: string;
  py_ok: boolean;
  cli: string | null;
  imports: Record<string, true | string>;
}

function runProbe(python: string, extraPath: string): Promise<ProbeResult | null> {
  return new Promise((resolve) => {
    const PATH = [extraPath, path.join(os.homedir(), '.local', 'bin'), process.env.PATH ?? '']
      .filter(Boolean)
      .join(path.delimiter);
    execFile(python, ['-c', PROBE], { env: { ...process.env, PATH }, timeout: 30_000 }, (err, stdout) => {
      if (err) return resolve(null);
      try {
        resolve(JSON.parse(stdout) as ProbeResult);
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Inspect the environment the wizard will actually run in: the managed venv if it
 * exists, otherwise system Python (so a developer who already has everything installed
 * passes the gate without us creating a venv at all).
 */
export async function checkPythonEnv(): Promise<PythonEnvStatus> {
  const python = activePython();
  // "managed" = not bare system Python (bundled interpreter or our own venv).
  const managed = !!(bundledPython() || managedPython());

  if (!python) {
    return {
      ok: false,
      python: null,
      pythonVersion: null,
      managed: false,
      checks: [
        { name: 'Python 3.10+', ok: false, detail: 'No Python interpreter found on PATH.', blocker: true },
      ],
    };
  }

  // Put the active bin dir first so the probe's shutil.which finds the bundled/venv cli.
  const probe = await runProbe(python, activeBinDir() ?? '');
  if (!probe) {
    return {
      ok: false,
      python,
      pythonVersion: null,
      managed,
      checks: [{ name: 'Python', ok: false, detail: `Could not run ${python}.`, blocker: true }],
    };
  }

  const cli = probe.cli || activeCliPath();
  const importDetail = (v: true | string) => (v === true ? 'importable' : v);
  const checks: PythonCheck[] = [
    { name: 'Python 3.10+', ok: probe.py_ok, detail: probe.version, blocker: true },
    {
      name: 'fairscape-cli on PATH',
      ok: !!cli,
      detail: cli || 'not found',
      blocker: true,
    },
    { name: 'fairscape_models', ok: probe.imports.fairscape_models === true, detail: importDetail(probe.imports.fairscape_models), blocker: true },
    { name: 'fairscape_cli', ok: probe.imports.fairscape_cli === true, detail: importDetail(probe.imports.fairscape_cli), blocker: true },
    { name: 'fairscape_wizard', ok: probe.imports.fairscape_wizard === true, detail: importDetail(probe.imports.fairscape_wizard), blocker: true },
  ];

  return {
    ok: checks.every((c) => !c.blocker || c.ok),
    python,
    pythonVersion: probe.version,
    managed,
    checks,
  };
}

// --- Install --------------------------------------------------------------------

/** Run a command, streaming each stdout/stderr line to `onLog`. Resolves with exit code. */
function streamRun(
  cmd: string,
  args: string[],
  onLog: (line: SetupLogLine) => void,
): Promise<number> {
  return new Promise((resolve) => {
    onLog({ stream: 'info', text: `$ ${path.basename(cmd)} ${args.join(' ')}` });
    const child = spawn(cmd, args, { env: process.env });
    const pump = (stream: 'out' | 'err') => (buf: Buffer) => {
      for (const line of buf.toString().split(/\r?\n/)) {
        if (line.length) onLog({ stream, text: line });
      }
    };
    child.stdout.on('data', pump('out'));
    child.stderr.on('data', pump('err'));
    child.on('error', (e) => {
      onLog({ stream: 'err', text: e.message });
      resolve(1);
    });
    child.on('close', (code) => resolve(code ?? 0));
  });
}

/** Packages to install for each mode, in dependency order for editable installs. */
function installArgs(mode: InstallMode, ctx: InstallContext): string[] {
  if (mode === 'editable') {
    const order: Array<keyof InstallContext['siblingRepos']> = [
      'fairscape_models',
      'fairscape-cli',
      'fairscape_grader',
    ];
    const args: string[] = [];
    for (const name of order) {
      const repo = ctx.siblingRepos[name];
      if (repo) args.push('-e', repo);
    }
    return args;
  }
  // fairscape-wizard pulls fairscape-cli + fairscape-models as dependencies.
  return ['fairscape-wizard'];
}

/**
 * Create the managed venv (if needed) and install the wizard's Python deps into it,
 * streaming progress. Prefers uv (dramatically faster) and falls back to pip. On
 * success, puts the venv on PATH and returns a fresh environment check.
 */
export async function installPythonEnv(
  mode: InstallMode,
  onLog: (line: SetupLogLine) => void,
): Promise<PythonEnvStatus> {
  const ctx = detectInstallContext();
  const py = systemPython();
  if (!py) {
    onLog({ stream: 'err', text: 'No system Python 3.10+ found. Install Python first, then retry.' });
    return checkPythonEnv();
  }

  const uv = uvBin();
  const targets = installArgs(mode, ctx);
  if (mode === 'editable' && targets.length === 0) {
    onLog({ stream: 'err', text: 'No sibling fairscape repos found — switch to the PyPI install.' });
    return checkPythonEnv();
  }

  const dir = venvDir();
  const venvPy = path.join(managedVenvBin(), isWin ? 'python.exe' : 'python');

  onLog({ stream: 'info', text: `Using ${uv ? `uv (${uv})` : 'pip'} · ${mode} install → ${dir}` });

  // 1. Create the venv (idempotent — skip if it already has a python).
  if (!managedPython()) {
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    const code = uv
      ? await streamRun(uv, ['venv', '--python', py, dir], onLog)
      : await streamRun(py, ['-m', 'venv', dir], onLog);
    if (code !== 0) {
      onLog({ stream: 'err', text: `venv creation failed (exit ${code}).` });
      return checkPythonEnv();
    }
  }

  // 2. Install the packages into that venv.
  let code: number;
  if (uv) {
    code = await streamRun(uv, ['pip', 'install', '--python', venvPy, ...targets], onLog);
  } else {
    await streamRun(venvPy, ['-m', 'pip', 'install', '--upgrade', 'pip'], onLog);
    code = await streamRun(venvPy, ['-m', 'pip', 'install', ...targets], onLog);
  }
  if (code !== 0) {
    onLog({ stream: 'err', text: `Install failed (exit ${code}). See output above.` });
    return checkPythonEnv();
  }

  // 3. Make the new venv the one the agent + CLI use, then re-verify.
  applyPythonEnvToPath();
  const status = await checkPythonEnv();
  onLog({
    stream: status.ok ? 'info' : 'err',
    text: status.ok ? 'Done — environment ready.' : 'Install finished but some checks still fail.',
  });
  return status;
}

/**
 * Put the managed venv first on PATH (and set VIRTUAL_ENV) for this process so every
 * subprocess we spawn — the Claude/OpenCode agent and its bash `python3`, plus the
 * fairscape-cli calls in crate.ts — resolves to the venv we set up. No-op if the venv
 * doesn't exist yet. Call once at startup and again after a successful install.
 */
export function applyPythonEnvToPath(): void {
  const bin = activeBinDir();
  if (!bin) return;
  const current = process.env.PATH ?? '';
  if (!current.split(path.delimiter).includes(bin)) {
    process.env.PATH = `${bin}${path.delimiter}${current}`;
  }
  // VIRTUAL_ENV only makes sense for our venv; the bundled interpreter finds its own
  // site-packages, and setting it for a non-venv can confuse tools.
  if (!bundledBin() && managedPython()) process.env.VIRTUAL_ENV = venvDir();
}
