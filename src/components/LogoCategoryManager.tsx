import { useMemo, useState } from "react";
import { useGyms } from "@/hooks/useGyms";
import {
  useLogoCategories, useAddLogoCategory, useRenameLogoCategory,
  useReorderLogoCategory, useDeleteLogoCategory, LogoCategory,
} from "@/hooks/useLogoCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowDown, ArrowUp, Check, Lock, Pencil, Plus, Trash2, X } from "lucide-react";

/**
 * The categories a logo can be filed under, in one place. The gallery chips,
 * the upload picker and this screen all read the same table, so renaming one
 * here moves every file with it instead of stranding them.
 */
export const LogoCategoryManager = () => {
  const { data: categories = [], isLoading } = useLogoCategories();
  const { data: gyms = [] } = useGyms();
  const add = useAddLogoCategory();
  const rename = useRenameLogoCategory();
  const reorder = useReorderLogoCategory();
  const remove = useDeleteLogoCategory();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // How many real files sit in each category, so deleting is never a guess.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    gyms.forEach(g =>
      (g.logos || []).forEach(l => {
        const k = l.variant || "Uncategorized";
        m.set(k, (m.get(k) || 0) + 1);
      })
    );
    return m;
  }, [gyms]);

  const fail = (e: unknown) =>
    toast({ variant: "destructive", description: e instanceof Error ? e.message : "That didn't save" });

  const submitNew = () => {
    if (!newName.trim()) return;
    add.mutate(newName, {
      onSuccess: () => { setNewName(""); toast({ description: `Added ${newName.trim()}` }); },
      onError: fail,
    });
  };

  const submitRename = (c: LogoCategory) => {
    if (!editValue.trim() || editValue.trim() === c.name) { setEditing(null); return; }
    const moved = counts.get(c.name) || 0;
    rename.mutate({ id: c.id, from: c.name, to: editValue }, {
      onSuccess: () => {
        setEditing(null);
        toast({ description: `Renamed to ${editValue.trim()}${moved ? ` · ${moved} logos moved with it` : ""}` });
      },
      onError: fail,
    });
  };

  const submitDelete = (c: LogoCategory) => {
    const n = counts.get(c.name) || 0;
    const msg = n
      ? `Delete "${c.name}"? Its ${n} logo${n === 1 ? "" : "s"} move to Uncategorized. No files are deleted.`
      : `Delete "${c.name}"? It is empty.`;
    if (!window.confirm(msg)) return;
    remove.mutate({ id: c.id, name: c.name }, {
      onSuccess: () => toast({ description: `Deleted ${c.name}${n ? ` · ${n} logos moved to Uncategorized` : ""}` }),
      onError: fail,
    });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading categories...</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submitNew()}
          placeholder="New category name"
          className="max-w-xs"
        />
        <Button onClick={submitNew} disabled={!newName.trim() || add.isPending}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      <div className="rounded-lg border divide-y">
        {categories.map((c, i) => {
          const n = counts.get(c.name) || 0;
          const isEditing = editing === c.id;
          return (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <div className="flex flex-col">
                <button
                  disabled={i === 0}
                  onClick={() => reorder.mutate({ a: c, b: categories[i - 1] })}
                  className="disabled:opacity-20"
                  title="Move up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={i === categories.length - 1}
                  onClick={() => reorder.mutate({ a: c, b: categories[i + 1] })}
                  className="disabled:opacity-20"
                  title="Move down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {isEditing ? (
                <>
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") submitRename(c);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="max-w-xs h-8"
                  />
                  <Button size="sm" variant="ghost" onClick={() => submitRename(c)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-semibold flex items-center gap-1.5">
                    {c.name}
                    {c.is_protected && (
                      <Lock className="w-3 h-3 text-muted-foreground" aria-label="Built in - cannot be removed" />
                    )}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-bold">{n}</span>
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={c.is_protected}
                      onClick={() => { setEditing(c.id); setEditValue(c.name); }}
                      title={c.is_protected ? "Built in - cannot be renamed" : "Rename"}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={c.is_protected}
                      onClick={() => submitDelete(c)}
                      title={c.is_protected ? "Built in - cannot be deleted" : "Delete"}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Renaming a category moves its logos with it. Deleting one moves its logos to
        Uncategorized — no file is ever deleted here.
      </p>
    </div>
  );
};
