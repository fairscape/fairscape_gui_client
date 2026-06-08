import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Never let an API key reach the engine: in non-interactive mode an
 * ANTHROPIC_API_KEY overrides subscription OAuth and forces per-token billing.
 * (Validated: with no key, the SDK runs on the Pro subscription, model opus.)
 */
export function stripApiKeys(): void {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
}

/** Best-effort check that the user has logged into Claude Code. */
export function hasClaudeLogin(): boolean {
  // macOS keeps credentials in the Keychain (not a file we can stat) — assume present.
  if (process.platform === 'darwin') return true;
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return fs.existsSync(path.join(dir, '.credentials.json'));
}

export type AuthIssue = 'login' | 'credit' | 'rate' | 'other';

/** Map an SDKAssistantMessageError to a user-facing category. */
export function classifyError(err?: string): AuthIssue | null {
  switch (err) {
    case undefined:
      return null;
    case 'authentication_failed':
    case 'oauth_org_not_allowed':
      return 'login';
    case 'billing_error':
      return 'credit';
    case 'rate_limit':
      return 'rate';
    default:
      return 'other';
  }
}
