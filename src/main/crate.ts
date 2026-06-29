// Crate Workspace main-process logic: read/parse ro-crate-metadata.json, build
// evidence graphs and register entities via the fairscape-cli subprocess, and
// apply field edits by JSON read-modify-write. All fs/subprocess work lives here
// (the sandboxed renderer reaches it only through the typed window.fairscape IPC).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { activeCliPath, activeBinDir } from './python-env';
import type { Crate, CrateEntity, EntityPatch, NewEntity, RawGraphData, CliResult } from '../shared/types';

const METADATA = 'ro-crate-metadata.json';
const DESCRIPTOR_IDS = new Set([METADATA, `./${METADATA}`, `/${METADATA}`]);

/** Pull the root entity's @id from the metadata descriptor's `about` reference. */
function rootIdOf(graph: CrateEntity[]): string | undefined {
  const descriptor = graph.find((e) => DESCRIPTOR_IDS.has(String(e['@id'])));
  const about = descriptor?.about as { '@id'?: string } | Array<{ '@id'?: string }> | undefined;
  const ref = Array.isArray(about) ? about[0] : about;
  return ref?.['@id'];
}

/** Parse <dir>/ro-crate-metadata.json. Returns null on missing/invalid file. */
export function readCrate(dir: string): Crate | null {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, METADATA), 'utf8'));
    const graph: CrateEntity[] = Array.isArray(raw['@graph']) ? raw['@graph'] : [];
    return { '@context': raw['@context'], '@graph': graph, rootId: rootIdOf(graph) };
  } catch {
    return null;
  }
}

/** Resolve fairscape-cli: env override → managed venv → ~/.local/bin → /usr/local/bin → PATH. */
function cliPath(): string {
  const candidates = [
    process.env.FAIRSCAPE_CLI,
    activeCliPath(),
    path.join(os.homedir(), '.local', 'bin', 'fairscape-cli'),
    '/usr/local/bin/fairscape-cli',
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return 'fairscape-cli';
}

/** Run fairscape-cli with a PATH-augmented env (packaged Electron starts with a thin PATH). */
function runCli(args: string[], cwd?: string): Promise<CliResult> {
  return new Promise((resolve) => {
    const localBin = path.join(os.homedir(), '.local', 'bin');
    // Bundled/managed bin first so the CLI (and any python it spawns) uses our env.
    const env = {
      ...process.env,
      PATH: [activeBinDir(), localBin, process.env.PATH ?? '']
        .filter(Boolean)
        .join(path.delimiter),
    };
    execFile(
      cliPath(),
      args,
      { cwd, env, timeout: 180_000, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({ ok: !err, stdout: stdout ?? '', stderr: stderr || (err ? err.message : '') });
      },
    );
  });
}

/** Subdirectory under the crate that holds per-root evidence-graph artifacts. */
const EVIDENCE_DIR = 'provenance-graphs';

/** Deterministic, unique output path for a given root ARK (so each graph is its own file). */
export function evidenceGraphPath(dir: string, arkId: string): string {
  const slug = arkId.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'root';
  return path.join(dir, EVIDENCE_DIR, `${slug}.json`);
}

/**
 * Build an evidence graph rooted at `arkId` and return its JSON. Each root gets its
 * own file under `<crate>/provenance-graphs/<slug>.json` (with a sibling .html), so
 * graphs for different roots don't overwrite each other and the crate root stays
 * clean. The path is derived deterministically from the ARK and read straight back.
 */
export async function buildEvidenceGraph(dir: string, arkId: string): Promise<RawGraphData | null> {
  const out = evidenceGraphPath(dir, arkId);
  try {
    fs.mkdirSync(path.dirname(out), { recursive: true });
  } catch {
    /* the CLI also creates it; best-effort */
  }
  const res = await runCli(['build', 'evidence-graph', dir, arkId, '--output-file', out], dir);
  if (!res.ok) {
    console.error('[crate] build evidence-graph failed:', res.stderr);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(out, 'utf8')) as RawGraphData;
  } catch (e) {
    console.error('[crate] could not read evidence-graph output:', e);
    return null;
  }
}

/** Apply field edits to one entity in place, write back pretty JSON, return the reloaded crate. */
export function updateEntity(dir: string, id: string, patch: EntityPatch): Crate | null {
  const file = path.join(dir, METADATA);
  let raw: { '@graph'?: CrateEntity[] };
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  const graph = Array.isArray(raw['@graph']) ? raw['@graph'] : [];
  const node = graph.find((e) => String(e['@id']) === id) as Record<string, unknown> | undefined;
  if (!node) return null;

  if (patch.name !== undefined) node.name = patch.name;
  if (patch.description !== undefined) node.description = patch.description;
  if (patch.version !== undefined) node.version = patch.version;
  if (patch.author !== undefined) node.author = patch.author;
  if (patch.keywords !== undefined) node.keywords = patch.keywords;
  for (const [rel, ids] of Object.entries(patch.links ?? {})) {
    node[rel] = (ids ?? []).map((x) => ({ '@id': x }));
  }

  try {
    fs.writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`);
  } catch (e) {
    console.error('[crate] failed to write crate metadata:', e);
    return null;
  }
  // Best-effort validation — surfaces problems in the CLI log, doesn't block the edit.
  void runCli(['rocrate', 'validate', dir], dir);
  return readCrate(dir);
}

/**
 * Dataset/Software registration requires a content source — a local file, an
 * external URL, or the `--embargoed` flag for metadata-only records. Default to
 * embargoed when the form supplies neither path nor URL.
 */
function addContentSource(args: string[], e: NewEntity): void {
  if (e.filepath) args.push('--filepath', e.filepath);
  else if (e.contentUrl) args.push('--content-url', e.contentUrl);
  else args.push('--embargoed');
}

/** Register a new Dataset/Software/Computation via the CLI (it mints the @id & JSON-LD shape). */
export async function addEntity(dir: string, e: NewEntity): Promise<CliResult> {
  const today = new Date().toISOString().slice(0, 10);
  const args = ['rocrate', 'register', e.kind, dir, '--name', e.name, '--description', e.description, '--keywords', e.keywords];

  if (e.kind === 'dataset') {
    args.push(
      '--author', e.author ?? '',
      '--version', e.version ?? '1.0',
      '--data-format', e.dataFormat ?? 'application/octet-stream',
      '--date-published', e.datePublished ?? today,
    );
    addContentSource(args, e);
  } else if (e.kind === 'software') {
    args.push(
      '--author', e.author ?? '',
      '--version', e.version ?? '1.0',
      '--file-format', e.fileFormat ?? 'application/octet-stream',
    );
    addContentSource(args, e);
  } else {
    args.push('--run-by', e.runBy ?? '', '--date-created', e.dateCreated ?? today);
    if (e.command) args.push('--command', e.command);
    for (const id of e.usedSoftware ?? []) args.push('--used-software', id);
    for (const id of e.usedDataset ?? []) args.push('--used-dataset', id);
    for (const id of e.generated ?? []) args.push('--generated', id);
  }
  return runCli(args, dir);
}

/** Validate the crate against ROCrate v1.2. */
export function validateCrate(dir: string): Promise<CliResult> {
  return runCli(['rocrate', 'validate', dir], dir);
}
