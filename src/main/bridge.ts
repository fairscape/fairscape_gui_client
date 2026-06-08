// The engine that drives a wizard run used to live here as `WizardSession`. It now lives in
// ./engine (a Claude implementation + an OpenCode implementation behind a shared interface).
// This file is kept as a thin re-export for any older imports.
export { createEngine, type AgentEngine, type PostFn } from './engine';
