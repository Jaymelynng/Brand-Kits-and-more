import { useState } from "react";
import { ArrowLeftRight, Check, CheckCheck, ChevronRight, Copy, Search, X } from "lucide-react";
import { GymWithColors } from "@/hooks/useGyms";
import { useToast } from "@/hooks/use-toast";
import { buildCopyText, countCopy, CopyWhat, CopyStyle } from "@/lib/copyFormats";

interface SelectionRailProps {
  gyms: GymWithColors[];
  selectedCodes: Set<string>;
  onToggle: (code: string) => void;
  onJumpTo: (code: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  searchQuery: string;
  onSearch: (q: string) => void;
}

const WHAT_OPTIONS: { value: CopyWhat; label: string }[] = [
  { value: "colors", label: "Colors" },
  { value: "logos", label: "Logos" },
  { value: "both", label: "Both" },
];

/** The second question is written in the words of the first answer. */
const STYLE_LABEL: Record<CopyWhat, Record<CopyStyle, string>> = {
  colors: { bare: "Hex codes only", named: "Hex + gym name" },
  logos: { bare: "Links only", named: "Links + gym name" },
  both: { bare: "Values only", named: "With gym names" },
};

const ACTION_WORD: Record<CopyWhat, string> = {
  colors: "hex codes",
  logos: "logo links",
  both: "colors + logos",
};

const SHELL = "#161C24";
const PANEL = "#1F2731";
const LINE = "#31404F";
const ACCENT = "#16B8A0";

export const SelectionRail = ({
  gyms,
  selectedCodes,
  onToggle,
  onJumpTo,
  onSelectAll,
  onClearAll,
  searchQuery,
  onSearch,
}: SelectionRailProps) => {
  const [what, setWhat] = useState<CopyWhat>("colors");
  const [style, setStyle] = useState<CopyStyle>("named");
  const [justCopied, setJustCopied] = useState(false);
  const { toast } = useToast();

  const selected = gyms.filter((g) => selectedCodes.has(g.code));
  const text = buildCopyText(selected, what, style);
  const counts = countCopy(selected, what);
  const q = searchQuery.trim().toLowerCase();
  const visible = q
    ? gyms.filter(
        (g) => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q)
      )
    : gyms;

  const handleCopy = () => {
    if (!text.trim()) {
      toast({ description: "Nothing selected", variant: "destructive", duration: 2000 });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1800);
      toast({ description: `Copied ${counts.gyms} gyms`, duration: 2000 });
    });
  };

  // Raised = you can press it. Pressed in = it is already on.
  const seg = (active: boolean) => ({
    background: active ? "#0E1319" : "#FFFFFF",
    color: active ? "#FFFFFF" : "#2B3947",
    border: `1.5px solid ${active ? "#0E1319" : "#C3CCD6"}`,
    boxShadow: active
      ? "inset 0 2px 5px rgba(0,0,0,0.65)"
      : "0 3px 0 #9AA6B2, 0 5px 10px rgba(0,0,0,0.45)",
    transform: active ? "translateY(2px)" : "none",
  });

  return (
    <aside
      className="z-40 flex w-full shrink-0 flex-col px-0 pb-0 lg:sticky lg:top-0 lg:h-screen lg:w-[300px]"
      style={{
        background: `linear-gradient(180deg, #1B222B 0%, ${SHELL} 45%, #10151B 100%)`,
        borderRight: "1px solid #0A0E13",
        boxShadow:
          "18px 0 34px -10px rgba(0,0,0,0.75), 6px 0 12px -6px rgba(0,0,0,0.55), inset -1px 0 0 rgba(255,255,255,0.05), inset 1px 0 0 rgba(255,255,255,0.07)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: `linear-gradient(180deg, #2A343F 0%, ${PANEL} 100%)`,
          borderBottom: "1px solid #0A0E13",
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        <div>
          <h1 className="text-[13px] font-extrabold tracking-[0.1em] text-white">
            BULK ACTIONS
          </h1>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            {counts.gyms === 0
              ? "No gyms picked - nothing will copy"
              : counts.gyms === gyms.length
                ? `All ${gyms.length} gyms will copy`
                : `${counts.gyms} of ${gyms.length} gyms will copy`}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-extrabold"
          style={{
            background: counts.gyms === 0 ? "#3A2020" : SHELL,
            color: counts.gyms === 0 ? "#E08A7B" : ACCENT,
          }}
        >
          {counts.gyms}
        </span>
      </div>

      {/* Step 1 controls, on their own plate */}
      <div
        className="space-y-3 px-4 py-3.5"
        style={{
          background: `linear-gradient(180deg, #242E38 0%, ${PANEL} 100%)`,
          borderBottom: "1px solid #0A0E13",
          boxShadow: "0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09)",
        }}
      >
        <p className="text-[10px] font-extrabold tracking-[0.16em]" style={{ color: ACCENT }}>
          1 · CHOOSE GYMS
        </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Find a gym"
          className="w-full rounded-lg py-2 pl-8 pr-2 text-xs font-semibold outline-none"
          style={{
            background: "#FFFFFF",
            color: SHELL,
            border: "1px solid #CFD4D8",
            boxShadow: "0 2px 5px rgba(0,0,0,0.30)",
          }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSelectAll}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-extrabold transition-all duration-100 active:translate-y-[3px] active:shadow-none"
          style={{
            background: ACCENT,
            color: "#06231F",
            border: `1.5px solid ${ACCENT}`,
            boxShadow: "0 3px 0 #0E8C79, 0 5px 10px rgba(0,0,0,0.45)",
          }}
        >
          <CheckCheck className="h-3.5 w-3.5" strokeWidth={3} />
          All {gyms.length}
        </button>
        <button
          onClick={onClearAll}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-extrabold transition-all duration-100 active:translate-y-[3px] active:shadow-none"
          style={{
            background: "#FFFFFF",
            color: "#B23A2E",
            border: "1.5px solid #C3CCD6",
            boxShadow: "0 3px 0 #9AA6B2, 0 5px 10px rgba(0,0,0,0.45)",
          }}
        >
          <X className="h-3.5 w-3.5" strokeWidth={3} />
          Clear
        </button>
      </div>

      </div>

      {/* The gyms themselves, on the shell */}
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3.5">

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-x-3 gap-y-3 overflow-hidden sm:grid-cols-4 lg:grid-cols-2"
        style={{
          gridTemplateRows: `repeat(${Math.max(1, Math.ceil(visible.length / 2))}, minmax(0, 1fr))`,
        }}
      >
        {visible.map((g) => {
          const on = selectedCodes.has(g.code);
          const logo = g.logos?.find((l) => l.is_main_logo) || g.logos?.[0];
          const c = g.colors?.[0]?.color_hex || "#334155";
          return (
            <div key={g.id} className="flex min-h-0 flex-col items-stretch gap-1">
              <button
                onClick={() => onToggle(g.code)}
                title={on ? `Unselect ${g.name}` : `Select ${g.name}`}
                className="group relative flex min-h-0 flex-1 items-center justify-center rounded-lg px-2 py-1 transition-all duration-150 active:translate-y-[2px]"
                style={{
                  background: "#FFFFFF",
                  border: `2.5px solid ${on ? ACCENT : "#FFFFFF"}`,
                  boxShadow: on
                    ? `0 3px 0 #0A0E13, 0 6px 16px ${ACCENT}66`
                    : "0 3px 0 #0A0E13, 0 5px 12px rgba(0,0,0,0.5)",
                  opacity: on ? 1 : 0.4,
                }}
              >
                <span
                  className="absolute left-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-[3px] transition-all duration-150"
                  style={{
                    background: on ? ACCENT : "#FFFFFF",
                    border: `1.5px solid ${on ? ACCENT : "#B6C0CB"}`,
                    boxShadow: on ? `0 0 0 2px ${ACCENT}33` : "none",
                  }}
                >
                  {on && <Check className="h-2.5 w-2.5" strokeWidth={4} color="#06231F" />}
                </span>
                {logo ? (
                  <img
                    src={logo.file_url}
                    alt={g.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[9px] font-bold text-slate-400">no logo</span>
                )}
              </button>
              <button
                onClick={() => onJumpTo(g.code)}
                title={`Go to ${g.name}`}
                className="group/pill flex items-center justify-center gap-0.5 rounded-full py-1 text-center text-[9px] font-extrabold leading-none tracking-[0.1em] text-white transition-transform duration-150 hover:scale-105"
                style={{ background: c, boxShadow: `0 2px 6px ${c}77` }}
              >
                {g.code}
                <ChevronRight className="h-2.5 w-2.5 transition-transform duration-150 group-hover/pill:translate-x-0.5" strokeWidth={4} />
              </button>
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="col-span-full py-4 text-center text-[11px] font-semibold text-slate-500">
            No gym matches that
          </p>
        )}
      </div>
      </div>

      {/* Step 2 */}
      <div
        className="space-y-3 px-4 py-4"
        style={{
          background: `linear-gradient(180deg, #242E38 0%, ${PANEL} 100%)`,
          borderTop: "1px solid #0A0E13",
          boxShadow:
            "0 -4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09)",
        }}
      >
        <div>
          <p className="mb-2 text-[10px] font-extrabold tracking-[0.16em]" style={{ color: ACCENT }}>
            2 · CHOOSE FORMAT
          </p>
          <div className="flex gap-1.5">
            {WHAT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setWhat(o.value)}
                className="flex-1 rounded-lg py-2 text-[11px] font-bold transition-all duration-100 active:translate-y-[3px] active:shadow-none"
                style={seg(what === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setStyle(style === "bare" ? "named" : "bare")}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[11px] font-bold transition-all duration-100 active:translate-y-[3px] active:shadow-none"
          style={seg(false)}
          title="Click to switch"
        >
          <span className="text-[12px]">{STYLE_LABEL[what][style]}</span>
          <span
            className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold tracking-wider"
            style={{
              background: ACCENT,
              color: "#06231F",
              boxShadow: `0 2px 6px ${ACCENT}66`,
            }}
          >
            <ArrowLeftRight className="h-3 w-3" strokeWidth={3} />
            SWITCH
          </span>
        </button>

      </div>

      {/* Footer: the action */}
      <div className="px-4 py-3.5" style={{
        borderTop: "1px solid #0A0E13",
        background: `linear-gradient(180deg, #202932 0%, #161C24 100%)`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}>
      <button
        onClick={handleCopy}
        disabled={selected.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-extrabold transition-all duration-100 active:translate-y-[4px] active:shadow-none disabled:opacity-35"
        style={{
          background: justCopied ? "#2F9E6F" : ACCENT,
          color: "#06231F",
          border: "none",
          boxShadow: `0 4px 0 ${justCopied ? "#1C6B4A" : "#0E8C79"}, 0 8px 20px rgba(0,0,0,0.55)`,
        }}
      >
        {justCopied ? (
          <>
            <Check className="h-4 w-4" strokeWidth={3} /> Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" strokeWidth={3} /> Copy {ACTION_WORD[what]} · {counts.gyms}
          </>
        )}
      </button>
      </div>
    </aside>
  );
};
