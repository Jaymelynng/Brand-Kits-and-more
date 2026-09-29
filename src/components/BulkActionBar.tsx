import { useState } from "react";
import { Check, CheckCheck, ChevronDown, Copy, X } from "lucide-react";
import { GymWithColors } from "@/hooks/useGyms";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildCopyText, CopyWhat, CopyStyle } from "@/lib/copyFormats";
import { copyText } from "@/lib/copyText";

interface BulkActionBarProps {
  gyms: GymWithColors[];
  selectedCodes: Set<string>;
  onSelectAll: () => void;
  onClearAll: () => void;
  /** Hidden admin gesture: five taps on the gym counter. */
  onSecretTap?: () => void;
  tapsLeft?: number | null;
  onOpenInventory?: () => void;
}

const FORMATS: { label: string; what: CopyWhat; style: CopyStyle }[] = [
  { label: "Copy colors", what: "colors", style: "named" },
  { label: "Colors + main logo URL", what: "colors-main", style: "named" },
  { label: "All logo URLs + gym names", what: "logos", style: "named" },
];

const ACCENT = "#16B8A0";

/** Copy actions always use the gyms selected in the strip above. */
export const BulkActionBar = ({
  gyms,
  selectedCodes,
  onSelectAll,
  onClearAll,
  onSecretTap,
  tapsLeft,
  onOpenInventory,
}: BulkActionBarProps) => {
  const [justCopied, setJustCopied] = useState<CopyWhat | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { toast } = useToast();

  const selected = gyms.filter((g) => selectedCodes.has(g.code));
  const copy = async (f: (typeof FORMATS)[number]) => {
    const text = buildCopyText(selected, f.what, f.style, window.location.origin);
    if (!text.trim()) {
      toast({ description: "No gyms picked", variant: "destructive", duration: 2000 });
      return;
    }
    if (!await copyText(text)) {
      toast({ description: "Could not copy. Please try again.", variant: "destructive" });
      return;
    }
    setJustCopied(f.what);
    setTimeout(() => setJustCopied(null), 1800);
    toast({ description: `Copied with gym names for ${selected.length} ${selected.length === 1 ? "gym" : "gyms"}`, duration: 2000 });
  };

  return (
    <div
      className="sticky z-40 px-4 pb-3 pt-3 sm:px-6"
      style={{
        // Cards must pass BEHIND this, not through it. A transparent sticky
        // wrapper lets them show in the gaps around the white pill.
        top: "var(--strip-h, 96px)",
        background: "rgba(233,235,238,0.92)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(22,28,36,0.10)",
      }}
    >
      <div
        className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl px-5 py-3.5 transition-all duration-300"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E7ED",
          boxShadow: "0 10px 26px -10px rgba(22,28,36,0.45), 0 2px 6px rgba(22,28,36,0.12)",
        }}
      >
        {/* Who is loaded */}
        <div className="leading-tight" onClick={onSecretTap} title="">
          <div
            key={selected.length}
            className="animate-in fade-in zoom-in-95 text-[15px] font-extrabold duration-200"
            style={{ color: selected.length === 0 ? "#B23A2E" : "#161C24" }}
          >
            {selected.length} {selected.length === 1 ? "gym" : "gyms"}
          </div>
          <div className="text-[15px] font-semibold text-slate-700">
            {typeof tapsLeft === "number" && tapsLeft > 0
              ? `${tapsLeft} more`
              : selected.length === 0
                ? "tap a logo above"
                : selected.length === gyms.length
                  ? "all selected"
                  : "selected above"}
          </div>
        </div>

        {onOpenInventory && <button className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-[15px] font-bold text-white shadow-md hover:bg-slate-700" onClick={onOpenInventory}>Logo manager</button>}
        {/* Pick them all, or none */}
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-extrabold transition-all duration-100 hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none"
            style={{
              background: ACCENT,
              color: "#06231F",
              border: `1.5px solid ${ACCENT}`,
              boxShadow: "0 3px 0 #0E8C79",
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={3} />
            All {gyms.length}
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[12px] font-extrabold transition-all duration-100 hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none"
            style={{
              // Never white on white. This bar is white, so the button needs
              // its own surface or it disappears into the card.
              background: "#B23A2E",
              color: "#FFFFFF",
              border: "1.5px solid #8E2A20",
              boxShadow: "0 3px 0 #7A2318",
            }}
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
            Clear
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => copy(FORMATS[1])}
            disabled={selected.length === 0}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[15px] font-extrabold text-white shadow-md transition-colors hover:bg-slate-700 disabled:cursor-default disabled:opacity-50"
          >
            {justCopied === "colors-main" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {justCopied === "colors-main" ? "Copied colors + main logo URL" : FORMATS[1].label}
          </button>
          <div className="flex">
          <button
            onClick={() => copy(FORMATS[0])}
            disabled={selected.length === 0}
            className="flex cursor-pointer items-center gap-2 rounded-l-xl py-3 pl-5 pr-4 text-[15px] font-extrabold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none disabled:translate-y-0"
            style={{
              background: selected.length === 0 ? "#8FA3B4" : justCopied ? "#2F9E6F" : ACCENT,
              color: selected.length === 0 ? "#F4F7FA" : "#06231F",
              border: "none",
              boxShadow: `0 4px 0 ${selected.length === 0 ? "#66798A" : justCopied ? "#1C6B4A" : "#0E8C79"}, 0 8px 18px rgba(22,28,36,0.3)`,
            }}
          >
            {justCopied === "colors" ? (
              <>
                <Check className="h-4 w-4 animate-in zoom-in duration-200" strokeWidth={3} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" strokeWidth={3} />
                Copy colors
              </>
            )}
          </button>

          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                disabled={selected.length === 0}
                title="Copy something else"
                aria-label="More copy options"
                className="flex items-center rounded-r-xl border-l px-2.5 py-3 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none disabled:translate-y-0"
                style={{
                  background: selected.length === 0 ? "#8FA3B4" : justCopied ? "#2F9E6F" : ACCENT,
                  borderLeftColor: selected.length === 0 ? "#66798A" : "#0E8C79",
                  color: selected.length === 0 ? "#F4F7FA" : "#06231F",
                  boxShadow: `0 4px 0 ${selected.length === 0 ? "#66798A" : justCopied ? "#1C6B4A" : "#0E8C79"}, 0 8px 18px rgba(22,28,36,0.3)`,
                }}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                  strokeWidth={3}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5">
              {FORMATS.slice(2).map((f) => (
                <button
                  key={f.label}
                  onClick={() => {
                    setMenuOpen(false);
                    copy(f);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-2.5 text-left text-[15px] font-semibold hover:bg-muted"
                >
                  {f.label}
                  {f.what === justCopied && (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: ACCENT }} />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};
