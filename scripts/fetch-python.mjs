#!/usr/bin/env node
// Build a self-contained Python for bundling into the app (item 3 of the setup work —
// see docs/python-bundling.md). It downloads a relocatable CPython from
// python-build-standalone, installs the wizard's deps into it, makes it relocatable, and
// strips it down. The result lands at prebuilt/pyenv and is shipped via forge's
// extraResource; at runtime python-env.ts puts prebuilt/pyenv/bin first on PATH so the
// agent's `python3` / `fairscape-cli` resolve to it and the Setup Gate auto-skips.
//
// IMPORTANT: build natively, per platform. You cannot build the macOS bundle on Linux —
// installing native wheels (pydantic-core, etc.) needs the target interpreter to run. CI
// runs this on a linux runner and a macOS runner; each produces its own prebuilt/pyenv.
//
// Usage:
//   node scripts/fetch-python.mjs                # PyPI install (released fairscape-wizard)
//   node scripts/fetch-python.mjs --local        # install the working-tree sibling repos
//   PYTHON_MINOR=3.11 node scripts/fetch-python.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'prebuilt', 'pyenv');
const PYTHON_MINOR = process.env.PYTHON_MINOR || '3.12';
const LOCAL = process.argv.includes('--local');

// node arch/platform -> python-build-standalone target triple.
const TRIPLES = {
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
};

function log(msg) {
  console.log(`[fetch-python] ${msg}`);
}

function run(cmd, args, opts = {}) {
  log(`$ ${path.basename(cmd)} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

/** Pick the install_only asset for our platform from the latest PBS release. */
async function resolveAsset() {
  const key = `${process.platform}-${process.arch}`;
  const triple = TRIPLES[key];
  if (!triple) throw new Error(`Unsupported platform ${key}. Supported: ${Object.keys(TRIPLES).join(', ')}`);

  log(`Resolving CPython ${PYTHON_MINOR} for ${triple} …`);
  const res = await fetch('https://api.github.com/repos/astral-sh/python-build-standalone/releases/latest', {
    headers: { 'User-Agent': 'fairscape-studio-build', Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const release = await res.json();

  // Prefer the pre-stripped build — PBS strips it correctly (symbol versioning intact);
  // GNU `strip` on the unstripped libpython corrupts .gnu.version_d and breaks the
  // interpreter. Fall back to install_only if a stripped variant isn't published.
  const minor = PYTHON_MINOR.replace('.', '\\.');
  for (const suffix of ['install_only_stripped', 'install_only']) {
    const re = new RegExp(`^cpython-${minor}\\.(\\d+)\\+\\d+-${triple}-${suffix}\\.tar\\.gz$`);
    const matches = (release.assets || [])
      .map((a) => ({ a, m: re.exec(a.name) }))
      .filter((x) => x.m)
      .sort((x, y) => Number(y.m[1]) - Number(x.m[1]));
    if (matches.length)
      return { url: matches[0].a.browser_download_url, name: matches[0].a.name, tag: release.tag_name };
  }
  throw new Error(`No install_only asset for ${PYTHON_MINOR}/${triple} in release ${release.tag_name}`);
}

/** The bundled python interpreter (bin/python3 on linux & macOS). */
function bundledPython() {
  return path.join(OUT, 'bin', 'python3');
}

/** Rewrite absolute build-time shebangs in bin/ to `/usr/bin/env python3` so the bundle is
 *  relocatable: at runtime we put OUT/bin first on PATH, so `env python3` finds our copy. */
function makeRelocatable() {
  const bin = path.join(OUT, 'bin');
  for (const entry of fs.readdirSync(bin)) {
    const file = path.join(bin, entry);
    let stat;
    try {
      stat = fs.lstatSync(file);
    } catch {
      continue;
    }
    if (!stat.isFile()) continue;
    let head;
    try {
      const fd = fs.openSync(file, 'r');
      const buf = Buffer.alloc(256);
      const n = fs.readSync(fd, buf, 0, 256, 0);
      fs.closeSync(fd);
      head = buf.subarray(0, n).toString('utf8');
    } catch {
      continue;
    }
    // Only touch text scripts whose shebang points at this build's python.
    if (!head.startsWith('#!') || !head.includes(OUT)) continue;
    const body = fs.readFileSync(file, 'utf8');
    const fixed = body.replace(/^#!.*\n/, '#!/usr/bin/env python3\n');
    fs.writeFileSync(file, fixed);
    log(`relocatable shebang: bin/${entry}`);
  }
}

/** Remove unused stdlib to shrink the artifact. Conservative — interpreter comes
 *  pre-stripped from PBS (see resolveAsset). NOTE: do not prune pyarrow/pandas/h5py —
 *  fairscape-cli eagerly imports pyarrow.parquet at module load, so they're required. */
function strip() {
  const libDir = fs.readdirSync(path.join(OUT, 'lib')).find((d) => d.startsWith('python3'));
  const prune = [
    path.join(OUT, 'lib', libDir, 'test'),
    path.join(OUT, 'lib', libDir, 'idlelib'),
    path.join(OUT, 'lib', libDir, 'tkinter'),
    path.join(OUT, 'lib', libDir, 'turtledemo'),
    path.join(OUT, 'lib', libDir, 'lib2to3'),
    path.join(OUT, 'share'),
  ];
  for (const p of prune) fs.rmSync(p, { recursive: true, force: true });
  // Drop all __pycache__ dirs.
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === '__pycache__') fs.rmSync(f, { recursive: true, force: true });
        else walk(f);
      }
    }
  };
  walk(OUT);
}

function dirSizeMB(dir) {
  let total = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else
        try {
          total += fs.statSync(f).size;
        } catch {
          /* ignore */
        }
    }
  };
  walk(dir);
  return Math.round(total / 1024 / 1024);
}

async function main() {
  const { url, name, tag } = await resolveAsset();

  // Clean slate.
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  // Download + extract. The install_only tarball unpacks to a top-level `python/` dir.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pyenv-'));
  const tarball = path.join(tmp, name);
  log(`downloading ${name} (${tag}) …`);
  run('curl', ['-fsSL', '-o', tarball, url]);
  log('extracting …');
  run('tar', ['xzf', tarball, '-C', tmp]);
  fs.renameSync(path.join(tmp, 'python'), OUT);
  fs.rmSync(tmp, { recursive: true, force: true });

  const py = bundledPython();
  if (!fs.existsSync(py)) throw new Error(`expected interpreter at ${py}`);

  // Install the wizard's deps INTO the bundled interpreter's own site-packages (not a venv —
  // venvs hardcode absolute paths and break when the app is installed elsewhere).
  run(py, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  if (LOCAL) {
    // Bundle the working tree, in dependency order (regular installs, not editable).
    const repos = ['fairscape_models', 'fairscape-cli', 'fairscape_grader'].map((r) =>
      path.resolve(ROOT, '..', r),
    );
    for (const repo of repos) {
      if (!fs.existsSync(path.join(repo, 'pyproject.toml')))
        throw new Error(`--local: missing sibling repo ${repo}`);
    }
    run(py, ['-m', 'pip', 'install', ...repos]);
  } else {
    run(py, ['-m', 'pip', 'install', 'fairscape-wizard']);
  }

  makeRelocatable();
  strip();

  fs.writeFileSync(
    path.join(OUT, 'BUILD-INFO.txt'),
    [
      `built: ${new Date().toISOString()}`,
      `platform: ${process.platform}-${process.arch}`,
      `cpython: ${name}`,
      `pbs_release: ${tag}`,
      `source: ${LOCAL ? 'local sibling repos' : 'PyPI fairscape-wizard'}`,
      '',
    ].join('\n'),
  );

  log(`done — prebuilt/pyenv (${dirSizeMB(OUT)} MB)`);
}

main().catch((err) => {
  console.error(`[fetch-python] FAILED: ${err.message}`);
  process.exit(1);
});
