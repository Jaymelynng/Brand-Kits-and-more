import { useEffect, useRef, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InlineRenameProps {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  className?: string;
  inputClassName?: string;
  title?: string;
}

export function InlineRename({
  value,
  onSave,
  className,
  inputClassName,
  title = "Rename",
}: InlineRenameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn("flex items-center gap-1 min-w-0", className)} onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
          className={cn("h-7 px-2 py-1 text-sm rounded-none border-2 border-gym-primary bg-white text-foreground", inputClassName)}
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); commit(); }}
          className="shrink-0 p-1 rounded-none bg-gym-primary text-white hover:opacity-90"
          aria-label="Save name"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); cancel(); }}
          className="shrink-0 p-1 rounded-none bg-white border-2 border-foreground/40 text-foreground hover:bg-foreground/5"
          aria-label="Cancel rename"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 min-w-0 group/rename", className)}>
      <span className="truncate flex-1">{value}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title={title}
        aria-label={title}
        className="shrink-0 p-1 rounded-none bg-white border border-gym-primary/40 text-gym-primary hover:bg-gym-primary hover:text-white transition-colors opacity-70 group-hover/rename:opacity-100"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}
