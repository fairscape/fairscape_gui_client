import type { Config } from '@opencode-ai/sdk';
import { DEFAULT_OPENCODE_PORT } from '../shared/types';
import type { OpencodeProviders } from '../shared/types';
import { ensureOpencodeOnPath } from './opencode-binary';
import { loadOpencodeKeys } from './settings';

// ESM-only SDK loaded lazily so the CJS-built main process can use it.
type OcModule = typeof import('@opencode-ai/sdk');
let ocPromise: Promise<OcModule> | null = null;
const loadOc = (): Promise<OcModule> => (ocPromise ??= import('@opencode-ai/sdk'));

/**
 * Start a short-lived `opencode serve`, push the saved provider keys, list the available
 * providers/models, then shut the server down. Used by the settings page's "Test connection"
 * so the model dropdown reflects exactly what this machine's OpenCode can reach.
 */
export async function listOpencodeModels(port = DEFAULT_OPENCODE_PORT): Promise<OpencodeProviders> {
  ensureOpencodeOnPath();
  const { createOpencode } = await loadOc();
  const { client, server } = await createOpencode({
    hostname: '127.0.0.1',
    port,
    timeout: 20000,
    config: {} as Config,
  });
  try {
    for (const [providerID, key] of Object.entries(loadOpencodeKeys())) {
      if (!key) continue;
      try {
        await client.auth.set({ path: { id: providerID }, body: { type: 'api', key } });
      } catch {
        /* ignore — provider may already be authed */
      }
    }
    const res = await client.provider.list();
    const data = res.data;
    if (!data) return { providers: [], defaults: {}, connected: [] };
    return {
      providers: data.all.map((p) => ({
        id: p.id,
        name: p.name,
        env: p.env ?? [],
        models: Object.values(p.models).map((m) => ({ id: m.id, name: m.name })),
      })),
      defaults: data.default ?? {},
      connected: data.connected ?? [],
    };
  } finally {
    try {
      server.close();
    } catch {
      /* already stopped */
    }
  }
}
