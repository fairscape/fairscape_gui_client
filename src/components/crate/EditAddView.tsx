import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Crate } from '@/shared/types';
import { EditEntityForm } from './EditEntityForm';
import { AddEntityForm } from './AddEntityForm';

/** Edit/Add tab body: toggles between editing the selected entity and registering a new one. */
export function EditAddView({
  dir,
  crate,
  selectedId,
  onCrateChange,
  onReload,
}: {
  dir: string;
  crate: Crate;
  selectedId: string | null;
  onCrateChange: (crate: Crate) => void;
  onReload: () => void;
}) {
  const [mode, setMode] = useState<'edit' | 'add'>(selectedId ? 'edit' : 'add');

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-6">
        <div className="mb-5 inline-flex rounded-lg border border-border p-0.5">
          <button
            onClick={() => setMode('edit')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
              mode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Pencil className="size-3.5" /> Edit selected
          </button>
          <button
            onClick={() => setMode('add')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
              mode === 'add' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Plus className="size-3.5" /> Add new
          </button>
        </div>

        {mode === 'edit' ? (
          selectedId ? (
            <EditEntityForm dir={dir} crate={crate} entityId={selectedId} onSaved={onCrateChange} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Pick an entity in the Explore tab, then return here to edit its metadata.
            </p>
          )
        ) : (
          <AddEntityForm dir={dir} crate={crate} onAdded={onReload} />
        )}
      </div>
    </div>
  );
}
