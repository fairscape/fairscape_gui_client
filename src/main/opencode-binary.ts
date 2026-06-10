import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Makes the *bundled* `opencode` CLI discoverable so end users never install it themselves.
 *
 * We ship the binary via the `opencode-ai` npm package, whose postinstall hard-links this
 * platform's native executable to `node_modules/opencode-ai/bin/opencode.exe` (that filename
 * is used on every OS, Linux/macOS included). The OpenCode SDK starts the server by spawning
 * the bare command `opencode` resolved through PATH (cross-spawn) — it offers no way to pass a
 * binary path — so we put the vendored binary on PATH before any `createOpencode` call.
 *
 * On POSIX the file is named `opencode.exe`, which a bare `opencode` lookup won't match, so we
 * expose it through a writable launcher dir (userData) containing a symlink named `opencode`.
 * On Windows the `.exe` is resolvable directly, so we just prepend its own folder.
 *
 * If no bundled binary is present (e.g. a dev tree without `opencode-ai` installed), this is a
 * no-op and the SDK falls back to a user-installed `opencode` on PATH — preserving prior behavior.
 */

const BIN_REL = path.join('node_modules', 'opencode-ai', 'bin', 'opencode.exe');

let resolved: string | null | undefined;

/**
 * Absolute path to the bundled opencode binary, or null when it isn't bundled.
 * Packaged: shipped via Forge `extraResource` to `<resources>/opencode.exe`.
 * Dev: the vendored file inside node_modules.
 */
function bundledBinaryPath(): string | null {
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, 'opencode.exe')]
    : [path.join(app.getAppPath(), BIN_REL), path.join(process.cwd(), BIN_REL)];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function prependToPath(dir: string): void {
  const sep = process.platform === 'win32' ? ';' : ':';
  const current = process.env.PATH ?? '';
  if (current.split(sep).includes(dir)) return;
  process.env.PATH = current ? `${dir}${sep}${current}` : dir;
}

function isSymlink(p: string): boolean {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Ensure the bundled `opencode` is on PATH. Memoized — safe to call before every run. Returns
 * the binary path that was wired up, or null if we're relying on a user-installed `opencode`.
 */
export function ensureOpencodeOnPath(): string | null {
  if (resolved !== undefined) return resolved;
  const binary = bundledBinaryPath();
  if (!binary) return (resolved = null);

  // Windows: the vendored file is opencode.exe, which cross-spawn resolves from its own dir.
  if (process.platform === 'win32') {
    prependToPath(path.dirname(binary));
    return (resolved = binary);
  }

  // POSIX: surface opencode.exe under the name `opencode` via a writable symlink we control,
  // refreshed each launch so an app update repoints it at the new binary. The app bundle
  // itself may be read-only/signed (macOS), so the link lives in userData, not next to the binary.
  const dir = path.join(app.getPath('userData'), 'opencode-bin');
  const launcher = path.join(dir, 'opencode');
  try {
    fs.mkdirSync(dir, { recursive: true });
    if (isSymlink(launcher) || fs.existsSync(launcher)) fs.rmSync(launcher, { force: true });
    fs.symlinkSync(binary, launcher);
    prependToPath(dir);
    return (resolved = launcher);
  } catch {
    // Couldn't create the launcher — fall back to a user-installed `opencode` on PATH.
    return (resolved = null);
  }
}
