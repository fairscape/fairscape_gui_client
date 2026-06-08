import { useState } from 'react';
import { ShieldQuestion, Terminal, FilePen } from 'lucide-react';
import { Markdown } from '@/components/Markdown';
import type { PermissionRequest, PermissionDecision } from '@/shared/types';

function describe(req: PermissionRequest): string {
  const input = req.input as Record<string, unknown> | undefined;
  if (req.toolName === 'Bash' && typeof input?.command === 'string') return input.command;
  if (typeof input?.file_path === 'string') return input.file_path;
  if (typeof input?.path === 'string') return input.path;
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return '';
  }
}

export function PermissionDialog({
  permission,
  pendingCount = 1,
  context,
  onRespond,
  onAutoApprove,
}: {
  permission: PermissionRequest;
  pendingCount?: number;
  context?: string | null;
  onRespond: (id: string, decision: PermissionDecision) => void;
  onAutoApprove: () => void;
}) {
  const [dontAsk, setDontAsk] = useState(false);
  const Icon = permission.toolName === 'Bash' ? Terminal : FilePen;
  const detail = describe(permission);

  function allow() {
    if (dontAsk) onAutoApprove();
    onRespond(permission.id, { allow: true });
  }

  return (
    <div className="rounded-xl border border-warning/40 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-warning">
        <ShieldQuestion className="size-5" />
        <h3 className="text-sm font-semibold">Permission needed</h3>
        {permission.agentID && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            from a sub-agent
          </span>
        )}
        {pendingCount > 1 && (
          <span className="ml-auto text-xs text-muted-foreground">1 of {pendingCount} pending</span>
        )}
      </div>
      {context && (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-foreground/90">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Why
          </p>
          <Markdown>{context}</Markdown>
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        {permission.title ?? (
          <>
            Allow <span className="font-medium text-foreground">{permission.toolName}</span>?
          </>
        )}
      </p>
      <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
        <span className="mr-2 inline-flex items-center gap-1 text-muted-foreground">
          <Icon className="size-3" />
          {permission.toolName}
        </span>
        {detail}
      </pre>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={dontAsk}
          onChange={(e) => setDontAsk(e.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        Don't ask again this run — auto-approve writes &amp; commands (e.g. grading's 28 score files)
      </label>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => onRespond(permission.id, { allow: false })}
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-accent"
        >
          Deny
        </button>
        <button
          onClick={allow}
          className="rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {dontAsk ? 'Allow & don’t ask again' : 'Allow'}
        </button>
      </div>
    </div>
  );
}
