import { useMemo, useState } from "react";
import { useGyms } from "@/hooks/useGyms";
import {
  useLogoTags, useAddLogoTag, useRenameLogoTag, useDeleteLogoTag, LogoTag,
} from "@/hooks/useLogoTags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

/**
 * The tag vocabulary. A category is where a logo lives - one only, managed
 * next door. A tag is what a logo IS, and it wears as many as fit.
 */
export const LogoTagManager = () => {
  const { data: tags = [], isLoading, error, refetch } = useLogoTags();
  const { data: gyms = [] } = useGyms();
  const add = useAddLogoTag();
  const rename = useRenameLogoTag();
  const remove = useDeleteLogoTag();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    gyms.forEach(g =>
      (g.logos || []).forEach(l =>
        (l.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1))
      )
    );
    return m;
  }, [gyms]);

  const kinds = useMemo(() => {
    const m = new Map<string, LogoTag[]>();
    tags.forEach(t => {
      const list = m.get(t.kind) || [];
      list.push(t);
      m.set(t.kind, list);
    });
    return [...m.entries()];
  }, [tags]);

  const knownKinds = useMemo(() => [...new Set(tags.map(t => t.kind))], [tags]);

  const selectedKind = newKind || knownKinds[0] || "";

  const fail = (e: unknown) =>
    toast({ variant: "destructive", description: e instanceof Error ? e.message : "That did not save" });

  const submitNew = () => {
    if (!newName.trim() || !selectedKind) return;
    add.mutate({ name: newName, kind: selectedKind }, {
      onSuccess: () => { toast({ description: `Added ${newName.trim()} under ${selectedKind}` }); setNewName(""); },
      onError: fail,
    });
  };

  const submitRename = (t: LogoTag) => {
    if (!editValue.trim() || editValue.trim() === t.name) { setEditing(null); return; }
    rename.mutate({ id: t.id, to: editValue }, {
      onSuccess: () => { setEditing(null); toast({ description: `Renamed to ${editValue.trim()}` }); },
      onError: fail,
    });
  };

  const submitDelete = (t: LogoTag) => {
    const n = counts.get(t.name) || 0;
    const msg = n
      ? `Delete the "${t.name}" tag? It comes off ${n} logo${n === 1 ? "" : "s"}. No file is deleted.`
      : `Delete the "${t.name}" tag? Nothing uses it.`;
    if (!window.confirm(msg)) return;
    remove.mutate(t.id, {
      onSuccess: () => toast({ description: `Deleted the ${t.name} tag` }),
      onError: fail,
    });
  };

  const enabled = !!newName.trim() && !!selectedKind && !add.isPending;

  if (isLoading) return <p className="text-[15px] text-slate-800">Loading tags...</p>;

  if (error) return <div role="alert" className="admin-error">Tags could not be loaded. <button className="admin-action" onClick={() => void refetch()}>Try again</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submitNew()}
          placeholder="New tag name"
          aria-label="New tag name" className="min-w-0 w-full text-[15px]"
        />
        <div className="admin-filter-row w-full" role="group" aria-label="Tag kind">
          {knownKinds.map(kind => <button key={kind} aria-pressed={selectedKind === kind} onClick={() => setNewKind(kind)}>{kind}</button>)}
        </div>
        <Button
          onClick={submitNew}
          disabled={!enabled}
          className="cursor-pointer border-2 text-[15px] text-white disabled:text-[#334155] hover:opacity-90"
          style={{
            background: enabled ? "#172433" : "#EDF1F5",
            borderColor: enabled ? "#172433" : "#D7DEE6",
            opacity: 1,
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      <div className="space-y-4">
        {kinds.map(([kind, list]) => (
          <div key={kind}>
            <div className="text-[15px] font-bold text-slate-900 mb-2">
              {kind}
            </div>
            <div className="rounded-lg border divide-y">
              {list.map(t => {
                const n = counts.get(t.name) || 0;
                const isEditing = editing === t.id;
                return (
                  <div key={t.id} className="flex flex-wrap items-center gap-2 p-3">
                    {isEditing ? (
                      <>
                        <Input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") submitRename(t);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          aria-label={`Rename ${t.name}`} className="w-full min-w-0 h-10 text-[15px]"
                        />
                        <Button aria-label="Save tag name" size="sm" variant="ghost" onClick={() => submitRename(t)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button aria-label="Cancel tag rename" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-[15px]">{t.name}</span>
                        <span className="text-[15px] px-2 py-0.5 rounded-full bg-muted font-bold">{n}</span>
                        <div className="ml-auto flex gap-1">
                          <Button size="sm" variant="ghost"
                            onClick={() => { setEditing(t.id); setEditValue(t.name); }} aria-label={`Rename ${t.name}`} title="Rename">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => submitDelete(t)} aria-label={`Delete ${t.name}`} title="Delete">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[15px] text-slate-800">
        Renaming a tag carries every logo with it. Deleting one takes the label off those
        logos and leaves the files alone. To put a tag on a single logo, open that logo on
        its gym page.
      </p>
    </div>
  );
};
