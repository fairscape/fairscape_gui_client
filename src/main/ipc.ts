import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { CH } from '../shared/types';
import type {
  EntityPatch,
  FairscapeState,
  InstallMode,
  NewEntity,
  PermissionDecision,
  StudioConfig,
  WizardStart,
} from '../shared/types';
import { createEngine, type AgentEngine, type PostFn } from './engine';
import { readCrate, buildEvidenceGraph, updateEntity, addEntity, validateCrate } from './crate';
import { StateWatcher } from './state-watcher';
import { GradingWatcher } from './grading-watcher';
import { getConfig, saveConfig, saveOpencodeKey } from './settings';
import { hasClaudeLogin } from './auth';
import { checkPythonEnv, detectInstallContext, installPythonEnv } from './python-env';
import { listOpencodeModels } from './opencode-models';

let session: AgentEngine | null = null;
let watcher: StateWatcher | null = null;
let gradingWatcher: GradingWatcher | null = null;

function mainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

function send(channel: string, payload: unknown): void {
  mainWindow()?.webContents.send(channel, payload);
}

export function registerIpc(): void {
  ipcMain.handle(CH.pickFolder, async () => {
    const w = mainWindow();
    if (!w) return null;
    const result = await dialog.showOpenDialog(w, {
      properties: ['openDirectory', 'createDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(CH.startWizard, async (_e, config: WizardStart) => {
    session?.stop();
    watcher?.stop();
    gradingWatcher?.stop();

    watcher = new StateWatcher(config.dir, (state: FairscapeState) => send(CH.stateChange, state));
    watcher.start();

    gradingWatcher = new GradingWatcher(config.dir, (p) => send(CH.gradingProgress, p));
    gradingWatcher.start();

    const post: PostFn = (kind, payload) => {
      const channel =
        kind === 'agent' ? CH.agentEvent : kind === 'question' ? CH.question : CH.permission;
      send(channel, payload);
    };
    session = createEngine(config, post, () => gradingWatcher?.poke());
    await session.start();
  });

  ipcMain.handle(CH.answerQuestion, async (_e, p: { id: string; answers: Record<string, string | string[]> }) => {
    session?.answerQuestion(p.id, p.answers);
  });

  ipcMain.handle(CH.answerText, async (_e, text: string) => {
    session?.answerText(text);
  });

  ipcMain.handle(CH.interrupt, async (_e, text: string) => {
    await session?.interrupt(text);
  });

  ipcMain.handle(CH.respondPermission, async (_e, p: { id: string; decision: PermissionDecision }) => {
    session?.respondPermission(p.id, p.decision);
  });

  ipcMain.handle(CH.setAutoApprove, async (_e, on: boolean) => {
    session?.setAutoApprove(on);
  });

  ipcMain.handle(CH.getScore, async (_e, dir: string) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dir, 'grading', 'aggregated_score.json'), 'utf8'));
    } catch {
      return null;
    }
  });

  ipcMain.handle(CH.openDatasheet, async (_e, dir: string) => {
    const p = path.join(dir, 'ro-crate-datasheet.html');
    if (fs.existsSync(p)) await shell.openPath(p);
  });

  // --- Crate Workspace (explore / evidence graph / edit-add) ---
  ipcMain.handle(CH.readCrate, async (_e, dir: string) => readCrate(dir));

  ipcMain.handle(CH.buildEvidenceGraph, async (_e, p: { dir: string; arkId: string }) =>
    buildEvidenceGraph(p.dir, p.arkId),
  );

  ipcMain.handle(CH.updateEntity, async (_e, p: { dir: string; id: string; patch: EntityPatch }) =>
    updateEntity(p.dir, p.id, p.patch),
  );

  ipcMain.handle(CH.addEntity, async (_e, p: { dir: string; entity: NewEntity }) =>
    addEntity(p.dir, p.entity),
  );

  ipcMain.handle(CH.validateCrate, async (_e, dir: string) => validateCrate(dir));

  ipcMain.handle(CH.getConfig, async () => getConfig());

  ipcMain.handle(CH.saveConfig, async (_e, config: StudioConfig) => saveConfig(config));

  ipcMain.handle(CH.saveOpencodeKey, async (_e, p: { providerID: string; key: string }) =>
    saveOpencodeKey(p.providerID, p.key),
  );

  ipcMain.handle(CH.checkClaudeLogin, async () => hasClaudeLogin());

  // --- First-run setup (native Python-env bootstrap) ---
  ipcMain.handle(CH.checkPythonEnv, async () => checkPythonEnv());

  ipcMain.handle(CH.detectInstallContext, async () => detectInstallContext());

  ipcMain.handle(CH.installPythonEnv, async (_e, mode: InstallMode) =>
    installPythonEnv(mode, (line) => send(CH.setupLog, line)),
  );

  ipcMain.handle(CH.listOpencodeModels, async (_e, opts?: { port?: number }) =>
    listOpencodeModels(opts?.port),
  );
}

export function disposeIpc(): void {
  session?.stop();
  watcher?.stop();
  gradingWatcher?.stop();
  session = null;
  watcher = null;
  gradingWatcher = null;
}
