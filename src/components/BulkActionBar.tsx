import { useState } from "react";
import { Check, CheckCheck, ChevronDown, Copy, X } from "lucide-react";
import { GymWithColors } from "@/hooks/useGyms";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildCopyText, countCopy, CopyWhat, CopyStyle } from "@/lib/copyFormats";

interface BulkActionBarProps {
  gyms: GymWithColors[];
  selectedCodes: Set<string>;
  onSelectAll: () => void;
  onClearAll: () => void;
  /** Hidden admin gesture: five taps on the gym counter. */
  onSecretTap?: () => void;
  tapsLeft?: number | null;
}

/** Three things she actually copies. Not six combinations of two questions. */
const FORMATS: { label: string; what: CopyWhat; style: CopyStyle }[] = [
  { label: "Hex codes", what: "colors", style: "bare" },
  { label: "Hex codes + gym name", what: "colors", style: "named" },
  { label: "Logo links", what: "logos", style: "bare" },
];

const ACCENT = "#16B8A0";

/**
 * The action, not a control panel. Which gyms are picked is already said by
 * the lit logos above, so this is one button — the format lives behind its
 * chevron, the same way the gym cards do it.
 */
export const BulkActionBar = ({
  gyms,
  selectedCodes,
  onSelectAll,
  onClearAll,
  onSecretTap,
  tapsLeft,
}: BulkActionBarProps) => {
  const [format, setFormat] = useState(FORMATS[0]);
  const [justCopied, setJustCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { toast } = useToast();

  const selected = gyms.filter((g) => selectedCodes.has(g.code));
  const counts = countCopy(selected, format.what);

  const copy = (f: typeof format) => {
    const text = buildCopyText(selected, f.what, f.style);
    if (!text.trim()) {
      toast({ description: "No gyms picked", variant: "destructive", duration: 2000 });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      setFormat(f);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1800);
      toast({ description: `${f.label} copied from ${selected.length} gyms`, duration: 2000 });
    });
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
        className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl px-7 py-3.5 transition-all duration-300"
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
          <div className="text-[11px] font-semibold text-slate-400">
            {typeof tapsLeft === "number" && tapsLeft > 0
              ? `${tapsLeft} more`
              : selected.length === 0
                ? "tap a logo above"
                : selected.length === gyms.length
                  ? `every gym · ${format.label.toLowerCase()}`
                  : format.label.toLowerCase()}
          </div>
        </div>

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

        {/* One button. The format lives behind the chevron. */}
        <div className="flex">
          <button
            onClick={() => copy(format)}
            disabled={selected.length === 0}
            className="flex items-center gap-2 rounded-l-xl py-3 pl-5 pr-4 text-[13px] font-extrabold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none disabled:translate-y-0"
            style={{
              background: selected.length === 0 ? "#8FA3B4" : justCopied ? "#2F9E6F" : ACCENT,
              color: selected.length === 0 ? "#F4F7FA" : "#06231F",
              border: "none",
              boxShadow: `0 4px 0 ${selected.length === 0 ? "#66798A" : justCopied ? "#1C6B4A" : "#0E8C79"}, 0 8px 18px rgba(22,28,36,0.3)`,
            }}
          >
            {justCopied ? (
              <>
                <Check className="h-4 w-4 animate-in zoom-in duration-200" strokeWidth={3} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" strokeWidth={3} />
                Copy {counts.gyms}
              </>
            )}
          </button>

          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                disabled={selected.length === 0}
                title="Copy something else"
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
              {FORMATS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => {
                    setMenuOpen(false);
                    copy(f);
                  }}
                  className="flex w-full items-center justify-between rounded px-2 py-2.5 text-left text-xs font-semibold hover:bg-muted"
                >
                  {f.label}
                  {f.label === format.label && (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: ACCENT }} />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
