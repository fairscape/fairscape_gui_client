import { type ReactNode } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {hint && <span className="mb-1.5 block text-xs text-muted-foreground">{hint}</span>}
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(inputClass, 'resize-y')}
    />
  );
}

export interface LinkOption {
  id: string;
  name: string;
  type: string;
}

/** Multi-select for relationship links: chips for chosen entities + a dropdown to add more. */
export function LinkMultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: LinkOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const available = options.filter((o) => !value.includes(o.id));

  return (
    <div>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {value.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 py-0.5 pl-2 pr-1 text-xs text-primary"
              title={id}
            >
              <span className="max-w-[16rem] truncate">{byId.get(id)?.name ?? id}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="rounded hover:bg-primary/15"
                aria-label="Remove"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Plus className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...value, e.target.value])}
          disabled={available.length === 0}
          className={cn(inputClass, 'pl-8 disabled:opacity-50')}
        >
          <option value="">
            {available.length ? 'Add…' : 'No more entities to link'}
          </option>
          {available.map((o) => (
            <option key={o.id} value={o.id}>
              {o.type} · {o.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
