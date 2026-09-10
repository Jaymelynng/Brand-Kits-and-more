import { useState } from "react";
import { GymLogo } from "@/hooks/useGyms";
import { LogoCategory } from "@/hooks/useLogoCategories";
import { LogoTag } from "@/hooks/useLogoTags";
import { FolderInput, Tag as TagIcon } from "lucide-react";

interface FilingTrayProps {
  categories: LogoCategory[];
  tags: LogoTag[];
  /** Every logo on the page, so a bucket can show what it currently holds. */
  logos: GymLogo[];
  /** Ids currently ticked. A drag of any one of them carries the whole set. */
  selectedIds: Set<string>;
  dragging: boolean;
  onDropCategory: (ids: string[], name: string) => void;
  onDropTag: (ids: string[], tag: LogoTag) => void;
  /** Which ids the current drag is carrying. */
  getDragIds: () => string[];
  primaryColor: string;
}

/**
 * Filing by dragging, because the alternative was: find a small button, hit a
 * small checkbox, open a popover, pick a row. Three fiddly targets for one
 * decision. Here the logo is the thing you already have hold of and the
 * bucket is a large target that lights up - and it takes a whole selection
 * at once, so twenty files cost the same gesture as one.
 */
export const FilingTray = ({
  categories, tags, logos, selectedIds, dragging,
  onDropCategory, onDropTag, getDragIds, primaryColor,
}: FilingTrayProps) => {
  const [over, setOver] = useState<string | null>(null);

  const catCount = (name: string) =>
    logos.filter(l => (l.variant || "Uncategorized") === name).length;
  const tagCount = (name: string) =>
    logos.filter(l => (l.tags || []).includes(name)).length;

  const n = selectedIds.size;

  const bucket = (
    key: string,
    label: string,
    count: number,
    onDrop: (ids: string[]) => void,
    accent: string,
  ) => {
    const hot = over === key;
    return (
      <button
        key={key}
        onDragOver={e => { e.preventDefault(); setOver(key); }}
        onDragLeave={() => setOver(o => (o === key ? null : o))}
        onDrop={e => {
          e.preventDefault();
          setOver(null);
          const ids = getDragIds();
          if (ids.length) onDrop(ids);
        }}
        onClick={() => { if (n > 0) onDrop([...selectedIds]); }}
        title={n > 0 ? `Click to file the ${n} selected here, or drop onto it` : "Drop a logo here"}
        className="flex shrink-0 flex-col items-start rounded-xl border-2 border-dashed px-4 py-2.5 text-left transition-all duration-150"
        style={{
          minWidth: 132,
          background: hot ? accent : "#FFFFFF",
          borderColor: hot ? accent : "#C9D3DE",
          color: hot ? "#FFFFFF" : "#31404F",
          transform: hot ? "translateY(-3px) scale(1.04)" : "none",
          boxShadow: hot ? `0 10px 24px ${accent}66` : "0 1px 2px rgba(16,24,32,0.08)",
        }}
      >
        <span className="text-sm font-extrabold leading-tight">{label}</span>
        <span
          className="text-[11px] font-bold"
          style={{ color: hot ? "rgba(255,255,255,0.85)" : "#7A8896" }}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t-2 bg-white/97 backdrop-blur-sm transition-transform duration-200"
      style={{
        borderColor: dragging ? primaryColor : "#DCE3EB",
        boxShadow: "0 -8px 28px rgba(16,24,32,0.16)",
      }}
    >
      <div className="mx-auto max-w-[1600px] px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {dragging
              ? "Drop it on a bucket"
              : n > 0
                ? `${n} selected — drag one onto a bucket, or click a bucket`
                : "Drag any logo down here to file it"}
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-1">
          <div className="flex shrink-0 items-center gap-2">
            <FolderInput className="h-4 w-4 shrink-0 text-muted-foreground" />
            {categories.map(c =>
              bucket(`cat:${c.id}`, c.name, catCount(c.name),
                ids => onDropCategory(ids, c.name), "#101820"))}
          </div>

          <div className="w-px shrink-0 self-stretch bg-border" />

          <div className="flex shrink-0 items-center gap-2">
            <TagIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            {tags.map(t =>
              bucket(`tag:${t.id}`, t.name, tagCount(t.name),
                ids => onDropTag(ids, t), primaryColor))}
          </div>
        </div>
      </div>
    </div>
  );
};
