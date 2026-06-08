import { contextBridge, ipcRenderer } from 'electron';
import { CH } from './shared/types';
import type {
  FairscapeApi,
  AgentEvent,
  FairscapeState,
  WizardQuestion,
  PermissionRequest,
  PermissionDecision,
  GradingProgress,
} from './shared/types';

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: unknown, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: FairscapeApi = {
  pickFolder: () => ipcRenderer.invoke(CH.pickFolder),
  startWizard: (config) => ipcRenderer.invoke(CH.startWizard, config),
  answerQuestion: (id, answers) => ipcRenderer.invoke(CH.answerQuestion, { id, answers }),
  answerText: (text) => ipcRenderer.invoke(CH.answerText, text),
  interrupt: (text) => ipcRenderer.invoke(CH.interrupt, text),
  respondPermission: (id, decision: PermissionDecision) =>
    ipcRenderer.invoke(CH.respondPermission, { id, decision }),
  setAutoApprove: (on) => ipcRenderer.invoke(CH.setAutoApprove, on),
  getScore: (dir) => ipcRenderer.invoke(CH.getScore, dir),
  openDatasheet: (dir) => ipcRenderer.invoke(CH.openDatasheet, dir),
  getConfig: () => ipcRenderer.invoke(CH.getConfig),
  saveConfig: (config) => ipcRenderer.invoke(CH.saveConfig, config),
  saveOpencodeKey: (providerID, key) => ipcRenderer.invoke(CH.saveOpencodeKey, { providerID, key }),
  checkClaudeLogin: () => ipcRenderer.invoke(CH.checkClaudeLogin),
  listOpencodeModels: (opts) => ipcRenderer.invoke(CH.listOpencodeModels, opts),
  onAgentEvent: (cb) => subscribe<AgentEvent>(CH.agentEvent, cb),
  onStateChange: (cb) => subscribe<FairscapeState>(CH.stateChange, cb),
  onQuestion: (cb) => subscribe<WizardQuestion>(CH.question, cb),
  onPermission: (cb) => subscribe<PermissionRequest>(CH.permission, cb),
  onGradingProgress: (cb) => subscribe<GradingProgress>(CH.gradingProgress, cb),
};

contextBridge.exposeInMainWorld('fairscape', api);
