// Folder scan for the manual-build Files tab: walk the crate directory and return its
// files as registration candidates, each with a byte size, MIME guess, and an
// extension-based Dataset/Software guess. Pure fs — no CLI. The renderer diffs the
// result against the crate's @graph contentUrls to mark which files are already registered.
import fs from 'node:fs';
import path from 'node:path';
import type { ScannedFile } from '../shared/types';

/** Names/dirs that are crate plumbing or noise, never registration candidates. */
const SKIP_NAMES = new Set(['ro-crate-metadata.json', '.fairscape-state.json', '.DS_Store']);
/** Subdirectories we never descend into (crate outputs / VCS). */
const SKIP_DIRS = new Set(['schemas', 'grading', '.git', 'node_modules']);

/** Extensions we treat as Software; everything else is guessed Dataset. */
const SOFTWARE_EXT = new Set([
  'py', 'ipynb', 'sh', 'bash', 'r', 'rmd', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'c', 'cc', 'cpp', 'h', 'hpp', 'java', 'go', 'rs', 'rb', 'pl', 'm', 'jl', 'scala', 'sql',
]);

/** Minimal extension→MIME map; the long tail falls back to application/octet-stream. */
const MIME: Record<string, string> = {
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  jsonld: 'application/ld+json',
  xml: 'application/xml',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  parquet: 'application/vnd.apache.parquet',
  h5: 'application/x-hdf5',
  hdf5: 'application/x-hdf5',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  zip: 'application/zip',
  gz: 'application/gzip',
  py: 'text/x-python',
  ipynb: 'application/x-ipynb+json',
  sh: 'application/x-sh',
  r: 'text/x-r',
  js: 'text/javascript',
  ts: 'application/typescript',
};

/** Recursively walk `dir`, collecting files relative to `root` (posix paths). */
function walk(dir: string, root: string, out: ScannedFile[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // unreadable dir — skip rather than crash the whole scan
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walk(full, root, out);
    } else if (entry.isFile()) {
      if (SKIP_NAMES.has(entry.name) || entry.name.startsWith('.')) continue;
      const rel = path.relative(root, full).split(path.sep).join('/');
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      let size = 0;
      try {
        size = fs.statSync(full).size;
      } catch {
        /* size stays 0 if stat fails */
      }
      out.push({
        path: rel,
        size,
        ext,
        mime: MIME[ext] ?? 'application/octet-stream',
        kind: SOFTWARE_EXT.has(ext) ? 'software' : 'dataset',
      });
    }
  }
}

/** List the crate folder's files as registration candidates, sorted by path. */
export function scanCrateFiles(dir: string): ScannedFile[] {
  const out: ScannedFile[] = [];
  walk(dir, dir, out);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
