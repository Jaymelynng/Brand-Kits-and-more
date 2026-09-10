import { useMemo, useState } from "react";
import { useGyms } from "@/hooks/useGyms";
import {
  useLogoCategories, useAddLogoCategory, useRenameLogoCategory,
  useReorderLogoCategory, useDeleteLogoCategory, LogoCategory,
} from "@/hooks/useLogoCategories";
import { LogoTagManager } from "@/components/LogoTagManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronLeft, ChevronRight, Lock, Pencil, Plus, Tags, Trash2, X } from "lucide-react";

const ROSE = "hsl(var(--brand-rose-gold))";

/**
 * Categories read left to right across the top - that IS their order in the
 * gallery, so the screen looks like the thing it controls. Tags are a second
 * axis, not a longer list, so they live behind a slide-out instead of
 * stacking underneath and doubling the height of the page.
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

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading categories...</p>;

  return (
    <div className="space-y-4">
      {/* The row reads the way the gallery reads. */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {categories.map((c, i) => {
          const n = counts.get(c.name) || 0;
          const isEditing = editing === c.id;
          return (
            <div
              key={c.id}
              className="group relative shrink-0 overflow-hidden rounded-xl border-2 bg-white px-4 pb-3 pt-4 transition-shadow hover:shadow-md"
              style={{ borderColor: "#E3E8EE", minWidth: 158 }}
            >
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") submitRename(c);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="h-8 w-32"
                  />
                  <button onClick={() => submitRename(c)} className="p-1"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(null)} className="p-1"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    {c.name}
                    {c.is_protected && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: ROSE }}>
                    {n}
                  </div>

                  {/* Controls stay out of the way until the card is hovered. */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-white/95 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      disabled={i === 0}
                      onClick={() => reorder.mutate({ a: c, b: categories[i - 1] })}
                      className="p-1 disabled:opacity-20"
                      title="Move left"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={c.is_protected}
                      onClick={() => { setEditing(c.id); setEditValue(c.name); }}
                      className="p-1 disabled:opacity-20"
                      title={c.is_protected ? "Built in" : "Rename"}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={c.is_protected}
                      onClick={() => submitDelete(c)}
                      className="p-1 disabled:opacity-20"
                      title={c.is_protected ? "Built in" : "Delete"}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                    <button
                      disabled={i === categories.length - 1}
                      onClick={() => reorder.mutate({ a: c, b: categories[i + 1] })}
                      className="p-1 disabled:opacity-20"
                      title="Move right"
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
          className="max-w-xs"
        />
        {/* Rose, not the default near-grey, which sat invisible against the
            dashboard's own grey. */}
        <Button
          onClick={submitNew}
          disabled={!newName.trim() || add.isPending}
          className="border-2 text-white disabled:text-[#8A97A4] hover:opacity-90"
          style={{
            background: enabled ? ROSE : "#EDF1F5",
            borderColor: enabled ? ROSE : "#D7DEE6",
            opacity: 1,
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add category
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="ml-auto border-2 bg-white" style={{ borderColor: ROSE, color: ROSE }}>
              <Tags className="mr-1.5 h-4 w-4" /> Tags
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" style={{ color: ROSE }} /> Tags
              </SheetTitle>
              <p className="text-left text-xs text-muted-foreground">
                A logo lives in one category but wears as many tags as fit.
              </p>
            </SheetHeader>
            <div className="mt-4">
              <LogoTagManager />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <p className="text-xs text-muted-foreground">
        Hover a card to rename, reorder or delete it. Renaming moves its logos with it;
        deleting moves them to Uncategorized — no file is ever deleted here.
      </p>
    </div>
  );
};
