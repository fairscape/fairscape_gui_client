import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_ENGINE, DEFAULT_MODEL } from '@/shared/types';
import type {
  AgentEvent,
  AggregatedScore,
  EngineId,
  FairscapeState,
  GradingProgress,
  PermissionDecision,
  PermissionRequest,
  Phase,
  StudioConfig,
  WizardQuestion,
  WizardStart,
} from '@/shared/types';

export interface FeedItem {
  id: number;
  event: AgentEvent;
  at: number;
}

export interface WizardModel {
  started: boolean;
  busy: boolean;
  folder: string | null;
  phase: Phase | undefined;
  state: FairscapeState | null;
  feed: FeedItem[];
  lastText: string | null;
  question: WizardQuestion | null;
  permission: PermissionRequest | null;
  permissionCount: number;
  awaitingText: boolean;
  systemInfo: { model: string; apiKeySource: string } | null;
  score: AggregatedScore | null;
  gradingProgress: GradingProgress | null;
  error: string | null;
  model: string;
  engine: EngineId;
  studioConfig: StudioConfig | null;
  autoApprove: boolean;
  // actions
  pickFolder: () => Promise<string | null>;
  reloadConfig: () => Promise<StudioConfig>;
  start: (config: WizardStart) => Promise<void>;
  setModel: (model: string) => void;
  setAutoApprove: (on: boolean) => void;
  answerQuestion: (id: string, answers: Record<string, string | string[]>) => void;
  answerText: (text: string) => void;
  interrupt: (text: string) => void;
  respondPermission: (id: string, decision: PermissionDecision) => void;
}

export function useWizard(): WizardModel {
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);
  const [state, setState] = useState<FairscapeState | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [lastText, setLastText] = useState<string | null>(null);
  const [question, setQuestion] = useState<WizardQuestion | null>(null);
  // Parallel sub-agents can request permissions simultaneously; queue them so none are lost.
  const [permissionQueue, setPermissionQueue] = useState<PermissionRequest[]>([]);
  const [awaitingText, setAwaitingText] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{ model: string; apiKeySource: string } | null>(null);
  const [score, setScore] = useState<AggregatedScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModelState] = useState<string>(DEFAULT_MODEL);
  const [engine, setEngineState] = useState<EngineId>(DEFAULT_ENGINE);
  const [studioConfig, setStudioConfig] = useState<StudioConfig | null>(null);
  const [autoApprove, setAutoApproveState] = useState(false);
  const [gradingProgress, setGradingProgress] = useState<GradingProgress | null>(null);
  const idRef = useRef(0);
  const folderRef = useRef<string | null>(null);
  const configRef = useRef<WizardStart | null>(null);

  useEffect(() => {
    const offEvent = window.fairscape.onAgentEvent((event) => {
      setFeed((f) => [...f, { id: idRef.current++, event, at: Date.now() }].slice(-400));
      switch (event.kind) {
        case 'system':
          setSystemInfo({ model: event.model, apiKeySource: event.apiKeySource });
          setBusy(true);
          break;
        case 'text':
          setLastText(event.text);
          setAwaitingText(false);
          setBusy(true);
          break;
        case 'tool':
          setAwaitingText(false);
          setBusy(true);
          break;
        case 'user':
          // Feed-only echo of a message we sent; state is handled by the send action.
          break;
        case 'result':
          // Turn settled cleanly: a question/permission would already be showing;
          // otherwise the wizard is awaiting our next plain-text message. Interrupted
          // turns (error_during_execution) are followed by our queued message, so
          // don't flash the "your turn" state for those.
          setBusy(false);
          if (event.subtype === 'success') setAwaitingText(true);
          break;
        case 'error':
          setError(event.message);
          setBusy(false);
          break;
      }
    });

    const offState = window.fairscape.onStateChange((s) => {
      setState(s);
      if ((s.phase === 'graded' || s.phase === 'improved') && folderRef.current) {
        window.fairscape.getScore(folderRef.current).then((sc) => sc && setScore(sc));
      }
    });
    const offQuestion = window.fairscape.onQuestion((q) => {
      setQuestion(q);
      setAwaitingText(false);
      setBusy(false);
    });
    const offPermission = window.fairscape.onPermission((p) => {
      setPermissionQueue((q) => [...q, p]);
      setBusy(false);
    });
    const offGrading = window.fairscape.onGradingProgress((p) => setGradingProgress(p));

    return () => {
      offEvent();
      offState();
      offQuestion();
      offPermission();
      offGrading();
    };
  }, []);

  const reloadConfig = useCallback(async () => {
    const cfg = await window.fairscape.getConfig();
    setStudioConfig(cfg);
    return cfg;
  }, []);

  useEffect(() => {
    void reloadConfig();
  }, [reloadConfig]);

  const setAutoApprove = useCallback((on: boolean) => {
    setAutoApproveState(on);
    void window.fairscape.setAutoApprove(on);
  }, []);

  const pickFolder = useCallback(() => window.fairscape.pickFolder(), []);

  const start = useCallback(async (config: WizardStart) => {
    configRef.current = config;
    setFolder(config.dir);
    folderRef.current = config.dir;
    setModelState(config.model);
    setEngineState(config.engine);
    setStarted(true);
    setBusy(true);
    setError(null);
    setFeed([]);
    setGradingProgress(null);
    setAutoApproveState(false);
    setPermissionQueue([]);
    setQuestion(null);
    await window.fairscape.startWizard(config);
  }, []);

  // Switching model restarts the session; the wizard resumes from .fairscape-state.json.
  const setModel = useCallback((m: string) => {
    setModelState(m);
    const cfg = configRef.current;
    if (cfg && cfg.model !== m) {
      const next = { ...cfg, model: m };
      configRef.current = next;
      setFeed([]);
      setBusy(true);
      setError(null);
      setAutoApproveState(false); // new session starts with prompts on
      void window.fairscape.startWizard(next);
    }
  }, []);

  const answerQuestion = useCallback((id: string, answers: Record<string, string | string[]>) => {
    window.fairscape.answerQuestion(id, answers);
    setQuestion(null);
    setBusy(true);
  }, []);

  const answerText = useCallback((text: string) => {
    window.fairscape.answerText(text);
    setAwaitingText(false);
    setLastText(null);
    setBusy(true);
  }, []);

  // Stop the running turn and inject `text` now. The bridge settles (denies) any
  // pending prompts, so dismiss their dialogs here too.
  const interrupt = useCallback((text: string) => {
    void window.fairscape.interrupt(text);
    setPermissionQueue([]);
    setQuestion(null);
    setAwaitingText(false);
    setLastText(null);
    setBusy(true);
  }, []);

  const respondPermission = useCallback((id: string, decision: PermissionDecision) => {
    window.fairscape.respondPermission(id, decision);
    setPermissionQueue((q) => q.filter((p) => p.id !== id));
    setBusy(true);
  }, []);

  return {
    started,
    busy,
    folder,
    phase: state?.phase,
    state,
    feed,
    lastText,
    question,
    permission: permissionQueue[0] ?? null,
    permissionCount: permissionQueue.length,
    awaitingText,
    systemInfo,
    score,
    gradingProgress,
    error,
    model,
    engine,
    studioConfig,
    autoApprove,
    pickFolder,
    reloadConfig,
    start,
    setModel,
    setAutoApprove,
    answerQuestion,
    answerText,
    interrupt,
    respondPermission,
  };
}
