import { useMemo, useState } from "react";
import { useGyms } from "@/hooks/useGyms";
import {
  useLogoCategories, useAddLogoCategory, useRenameLogoCategory,
  useReorderLogoCategory, useDeleteLogoCategory, LogoCategory,
} from "@/hooks/useLogoCategories";
import { LogoTagManager } from "@/components/LogoTagManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronLeft, ChevronRight, Lock, Pencil, Plus, Tags, Trash2, X } from "lucide-react";

const INK = "#172433";

/**
 * Categories read left to right across the top - that IS their order in the
 * gallery, so the screen looks like the thing it controls. Tags are a second
 * axis, not a longer list, so they live behind a slide-out instead of
 * stacking underneath and doubling the height of the page.
 */
export const LogoCategoryManager = () => {
  const { data: categories = [], isLoading, error, refetch } = useLogoCategories();
  const { data: gyms = [] } = useGyms();
  const add = useAddLogoCategory();
  const rename = useRenameLogoCategory();
  const reorder = useReorderLogoCategory();
  const remove = useDeleteLogoCategory();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
    toast({ variant: "destructive", description: e instanceof Error ? e.message : "That did not save" });

  const submitNew = () => {
    if (!newName.trim()) return;
    add.mutate(newName, {
      onSuccess: () => { toast({ description: `Added ${newName.trim()}` }); setNewName(""); },
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
      ? `Delete "${c.name}"? Its ${n} logo${n === 1 ? "" : "s"} move to Uncategorized. No file is deleted.`
      : `Delete "${c.name}"? It is empty.`;
    if (!window.confirm(msg)) return;
    remove.mutate({ id: c.id, name: c.name }, {
      onSuccess: () => toast({ description: `Deleted ${c.name}${n ? ` · ${n} logos moved to Uncategorized` : ""}` }),
      onError: fail,
    });
  };

  const enabled = !!newName.trim() && !add.isPending;

  if (isLoading) return <p className="text-[15px] text-slate-800">Loading categories...</p>;

  if (error) return <div role="alert" className="admin-error">Categories could not be loaded. <button className="admin-action" onClick={() => void refetch()}>Try again</button></div>;

  return (
    <div className="space-y-4 admin-category-manager">
      {/* The row reads the way the gallery reads. */}
      <div className="admin-category-grid">
        {categories.map((c, i) => {
          const n = counts.get(c.name) || 0;
          const isEditing = editing === c.id;
          return (
            <div
              key={c.id}
              className="admin-category-card"

            >
              {isEditing ? (
                <div className="flex flex-wrap items-center gap-1">
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") submitRename(c);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    aria-label={`Rename ${c.name}`} className="h-10 w-full min-w-0 text-[15px]"
                  />
                  <button aria-label="Save category name" onClick={() => submitRename(c)} className="admin-action"><Check className="h-4 w-4" /></button>
                  <button aria-label="Cancel category rename" onClick={() => setEditing(null)} className="admin-action"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[15px] font-bold">
                    {c.name}
                    {c.is_protected && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: INK }}>
                    {n}
                  </div>

                  {/* Controls remain visible for touch and keyboard users. */}
                  <div className="admin-category-actions">
                    <button
                      disabled={i === 0 || reorder.isPending}
                      onClick={() => reorder.mutate({ a: c, b: categories[i - 1] }, { onError: fail })}
                      className="admin-category-control"
                      aria-label={`Move ${c.name} left`} title="Move left"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={c.is_protected}
                      onClick={() => { setEditing(c.id); setEditValue(c.name); }}
                      className="admin-category-control"
                      aria-label={`Rename ${c.name}`} title={c.is_protected ? "Built in" : "Rename"}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={c.is_protected}
                      onClick={() => submitDelete(c)}
                      className="admin-category-control"
                      aria-label={`Delete ${c.name}`} title={c.is_protected ? "Built in" : "Delete"}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                    <button
                      disabled={i === categories.length - 1 || reorder.isPending}
                      onClick={() => reorder.mutate({ a: c, b: categories[i + 1] }, { onError: fail })}
                      className="admin-category-control"
                      aria-label={`Move ${c.name} right`} title="Move right"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submitNew()}
          placeholder="New category name"
          aria-label="New category name" className="min-w-0 flex-1 text-[15px]"
        />
        {/* Dark labels and a filled action keep the controls readable. */}
        <Button
          onClick={submitNew}
          disabled={!newName.trim() || add.isPending}
          className="cursor-pointer border-2 text-[15px] text-white disabled:text-[#334155] hover:opacity-90"
          style={{
            background: enabled ? INK : "#EDF1F5",
            borderColor: enabled ? INK : "#D7DEE6",
            opacity: 1,
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add category
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="cursor-pointer border-2 bg-white text-[15px]" style={{ borderColor: INK, color: INK }}>
              <Tags className="mr-1.5 h-4 w-4" /> Tags
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="admin-drawer w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" style={{ color: INK }} /> Tags
              </SheetTitle>
              <SheetDescription className="text-left text-[15px] text-slate-800">
                A logo lives in one category but wears as many tags as fit.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <LogoTagManager />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <p className="text-[15px] text-slate-800">
        Use each card’s controls to rename, reorder or delete a category. Renaming updates the label on its logos;
        deleting moves them to Uncategorized — no file is ever deleted here.
      </p>
    </div>
  );
};
