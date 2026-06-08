import { app, safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { DEFAULT_STUDIO_CONFIG } from '../shared/types';
import type { StudioConfig } from '../shared/types';

/**
 * Persistence for app settings (engine + model choices) and OpenCode provider API keys.
 * Settings live in userData/config.json; keys live separately in userData/opencode-credentials.json,
 * encrypted with Electron safeStorage where available. Keys are never written to config.json and
 * never logged.
 */

const configPath = (): string => path.join(app.getPath('userData'), 'config.json');
const credsPath = (): string => path.join(app.getPath('userData'), 'opencode-credentials.json');

type StoredCred = { enc: boolean; val: string };
type CredStore = Record<string, StoredCred>;

function readCreds(): CredStore {
  try {
    return JSON.parse(fs.readFileSync(credsPath(), 'utf8')) as CredStore;
  } catch {
    return {};
  }
}

function writeCreds(store: CredStore): void {
  fs.writeFileSync(credsPath(), JSON.stringify(store), { mode: 0o600 });
}

/** Read persisted settings merged over defaults; savedKeys is derived from the credential store. */
export function getConfig(): StudioConfig {
  let stored: Partial<StudioConfig> = {};
  try {
    stored = JSON.parse(fs.readFileSync(configPath(), 'utf8')) as Partial<StudioConfig>;
  } catch {
    /* no settings yet — use defaults */
  }
  const savedKeys = Object.keys(readCreds());
  return {
    engine: stored.engine ?? DEFAULT_STUDIO_CONFIG.engine,
    claude: { ...DEFAULT_STUDIO_CONFIG.claude, ...stored.claude },
    opencode: { ...DEFAULT_STUDIO_CONFIG.opencode, ...stored.opencode, savedKeys },
  };
}

/** Persist settings. API keys are managed separately (saveOpencodeKey) and not stored here. */
export function saveConfig(config: StudioConfig): void {
  const { opencode, ...rest } = config;
  const { savedKeys: _ignored, ...opencodeNoKeys } = opencode;
  void _ignored;
  const toStore: StudioConfig = { ...rest, opencode: { ...opencodeNoKeys } };
  fs.writeFileSync(configPath(), JSON.stringify(toStore, null, 2));
}

/** Store (or clear, when key is empty) an OpenCode provider API key. */
export function saveOpencodeKey(providerID: string, key: string): void {
  const store = readCreds();
  if (!key) {
    delete store[providerID];
    writeCreds(store);
    return;
  }
  if (safeStorage.isEncryptionAvailable()) {
    store[providerID] = { enc: true, val: safeStorage.encryptString(key).toString('base64') };
  } else {
    // No OS keyring (e.g. headless Linux): fall back to base64 so the app still works.
    store[providerID] = { enc: false, val: Buffer.from(key, 'utf8').toString('base64') };
  }
  writeCreds(store);
}

/** Decrypt all saved provider keys: { providerID -> apiKey }. */
export function loadOpencodeKeys(): Record<string, string> {
  const store = readCreds();
  const out: Record<string, string> = {};
  for (const [providerID, cred] of Object.entries(store)) {
    try {
      out[providerID] = cred.enc
        ? safeStorage.decryptString(Buffer.from(cred.val, 'base64'))
        : Buffer.from(cred.val, 'base64').toString('utf8');
    } catch {
      /* unreadable on this machine — skip */
    }
  }
  return out;
}
