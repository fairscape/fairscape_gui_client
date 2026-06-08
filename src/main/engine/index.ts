import type { WizardStart } from '../../shared/types';
import type { AgentEngine, PostFn } from './types';
import { ClaudeEngine } from './claude';
import { OpencodeEngine } from './opencode';

export type { AgentEngine, PostFn } from './types';

/**
 * Build the engine the user selected. Each engine lazy-loads its own SDK on start(), so
 * importing both classes here is cheap — neither SDK is touched until a run begins.
 */
export function createEngine(
  config: WizardStart,
  post: PostFn,
  onGradingWrite?: (path: string) => void,
): AgentEngine {
  return config.engine === 'opencode'
    ? new OpencodeEngine(config, post, onGradingWrite)
    : new ClaudeEngine(config, post, onGradingWrite);
}
