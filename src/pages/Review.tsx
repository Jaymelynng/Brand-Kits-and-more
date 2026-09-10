import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGyms, GymLogo } from "@/hooks/useGyms";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Trash2, Star, X } from "lucide-react";

const VARIANTS = [
  "Primary",
  "White / Reverse",
  "Dark",
  "Mono",
  "Icon",
  "Wordmark inline",
  "Wordmark stacked",
  "Hero",
  "Divider",
  "Framed variant",
];

const SHELL = "#161C24";
const PANEL = "#1F2731";
const LINE = "#31404F";
const ACCENT = "#16B8A0";

type Row = GymLogo & { gymCode: string; gymName: string };

/**
 * The review bench. Every logo, big enough to judge, with its gym and its
 * variant on the tile. Pick many, set them all at once, or bin them.
 * Nothing is destructive without the count being shown first.
 */
const Review = () => {
  const { data: gyms = [], isLoading } = useGyms();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [gymFilter, setGymFilter] = useState<string>("all");
  const [variantFilter, setVariantFilter] = useState<string>("all");
  const [size, setSize] = useState(180);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const rows: Row[] = useMemo(
    () =>
      gyms.flatMap((g) =>
        (g.logos || []).map((l) => ({ ...l, gymCode: g.code, gymName: g.name }))
      ),
    [gyms]
  );

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (gymFilter === "all" || r.gymCode === gymFilter) &&
          (variantFilter === "all" || (r.variant || "Primary") === variantFilter)
      ),
    [rows, gymFilter, variantFilter]
  );

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const setVariantOnPicked = async (variant: string) => {
    if (picked.size === 0) return;
    setBusy(true);
    const { error } = await supabase
      .from("gym_logos")
      .update({ variant })
      .in("id", [...picked]);
    setBusy(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ description: `${picked.size} set to ${variant}` });
    setPicked(new Set());
    qc.invalidateQueries({ queryKey: ["gyms"] });
  };

  const deletePicked = async () => {
    if (picked.size === 0) return;
    if (!confirm(`Delete ${picked.size} logo${picked.size === 1 ? "" : "s"}? This removes the row from the database.`)) return;
    setBusy(true);
    const { error } = await supabase.from("gym_logos").delete().in("id", [...picked]);
    setBusy(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ description: `${picked.size} deleted` });
    setPicked(new Set());
    qc.invalidateQueries({ queryKey: ["gyms"] });
  };

  const makeMain = async (row: Row) => {
    setBusy(true);
    await supabase.from("gym_logos").update({ is_main_logo: false }).eq("gym_id", row.gym_id);
    const { error } = await supabase
      .from("gym_logos")
      .update({ is_main_logo: true })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ description: `${row.gymCode} main logo set` });
    qc.invalidateQueries({ queryKey: ["gyms"] });
  };

  const chip = (active: boolean) => ({
    background: active ? ACCENT : "#FFFFFF",
    color: active ? "#06231F" : "#2B3947",
    border: `1.5px solid ${active ? ACCENT : "#C3CCD6"}`,
    boxShadow: active ? `0 2px 8px ${ACCENT}55` : "0 2px 0 #9AA6B2",
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: SHELL, color: "#fff" }}>
        Loading every logo…
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: SHELL }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-5 py-3"
        style={{ background: PANEL, borderBottom: `1px solid ${LINE}`, boxShadow: "0 4px 14px rgba(0,0,0,0.5)" }}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-[12px] font-bold text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div>
            <h1 className="text-[13px] font-extrabold tracking-[0.1em] text-white">REVIEW BENCH</h1>
            <p className="text-[11px] font-semibold text-slate-400">
              {picked.size === 0
                ? `${visible.length} showing of ${rows.length} logos`
                : `${picked.size} picked`}
            </p>
          </div>

          <div className="h-9 w-px bg-slate-600" />

          {/* Gym filter */}
          <select
            value={gymFilter}
            onChange={(e) => setGymFilter(e.target.value)}
            className="rounded-lg px-2.5 py-2 text-[12px] font-bold outline-none"
            style={{ background: "#fff", color: SHELL, border: "1px solid #CFD4D8" }}
          >
            <option value="all">All {gyms.length} gyms</option>
            {gyms.map((g) => (
              <option key={g.id} value={g.code}>
                {g.code} — {g.logos?.length || 0}
              </option>
            ))}
          </select>

          {/* Variant filter */}
          <select
            value={variantFilter}
            onChange={(e) => setVariantFilter(e.target.value)}
            className="rounded-lg px-2.5 py-2 text-[12px] font-bold outline-none"
            style={{ background: "#fff", color: SHELL, border: "1px solid #CFD4D8" }}
          >
            <option value="all">Every variant</option>
            {VARIANTS.map((v) => (
              <option key={v} value={v}>
                {v} — {rows.filter((r) => (r.variant || "Primary") === v).length}
              </option>
            ))}
          </select>

          {/* Tile size */}
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
            SIZE
            <input
              type="range"
              min={110}
              max={340}
              value={size}
              onChange={(e) => setSize(+e.target.value)}
              className="w-24"
            />
          </label>

          <div className="flex-1" />

          <button
            onClick={() => setPicked(new Set(visible.map((r) => r.id)))}
            className="rounded-lg px-3 py-2 text-[11px] font-extrabold"
            style={chip(false)}
          >
            Pick all {visible.length}
          </button>
          <button
            onClick={() => setPicked(new Set())}
            className="rounded-lg px-3 py-2 text-[11px] font-extrabold"
            style={chip(false)}
          >
            <X className="mr-1 inline h-3 w-3" />
            Clear
          </button>
        </div>

        {/* Bulk bar — only when something is picked */}
        {picked.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: LINE }}>
            <span className="text-[11px] font-extrabold tracking-wider" style={{ color: ACCENT }}>
              SET {picked.size} TO →
            </span>
            {VARIANTS.map((v) => (
              <button
                key={v}
                disabled={busy}
                onClick={() => setVariantOnPicked(v)}
                className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-40"
                style={chip(false)}
              >
                {v}
              </button>
            ))}
            <div className="flex-1" />
            <button
              disabled={busy}
              onClick={deletePicked}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-40"
              style={{ background: "#B23A2E", boxShadow: "0 3px 0 #7A2820" }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {picked.size}
            </button>
          </div>
        )}
      </div>

      {/* The bench */}
      <div
        className="grid gap-3 px-5 py-5"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))` }}
      >
        {visible.map((r) => {
          const on = picked.has(r.id);
          return (
            <div
              key={r.id}
              className="overflow-hidden rounded-xl transition-all duration-150"
              style={{
                background: "#FFFFFF",
                border: `2.5px solid ${on ? ACCENT : "transparent"}`,
                boxShadow: on ? `0 4px 0 #0A0E13, 0 8px 20px ${ACCENT}55` : "0 3px 0 #0A0E13",
                opacity: on ? 1 : 0.85,
              }}
            >
              <button
                onClick={() => toggle(r.id)}
                className="flex w-full items-center justify-center bg-[#f3f4f6] p-2"
                style={{ height: size * 0.72 }}
                title={r.filename}
              >
                <img src={r.file_url} alt={r.filename} className="max-h-full max-w-full object-contain" />
              </button>

              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white" style={{ background: SHELL }}>
                  {r.gymCode}
                </span>
                <span className="truncate text-[9px] font-bold text-slate-500" title={r.variant || "Primary"}>
                  {r.variant || "Primary"}
                </span>
                <button
                  onClick={() => makeMain(r)}
                  title={r.is_main_logo ? "This is the main logo" : "Make this the main logo"}
                  className="shrink-0"
                >
                  <Star
                    className="h-3.5 w-3.5"
                    fill={r.is_main_logo ? "#F5A623" : "none"}
                    color={r.is_main_logo ? "#F5A623" : "#94a3b8"}
                  />
                </button>
              </div>

              <p className="truncate px-2 pb-2 text-[8px] text-slate-400" title={r.filename}>
                {r.filename}
              </p>

              {on && (
                <div className="flex items-center justify-center gap-1 py-1" style={{ background: ACCENT }}>
                  <Check className="h-3 w-3" strokeWidth={4} color="#06231F" />
                </div>
              )}
            </div>
          );
        })}

        {visible.length === 0 && (
          <p className="col-span-full py-16 text-center text-sm font-semibold text-slate-500">
            Nothing matches that filter.
          </p>
        )}
      </div>
    </div>
  );
};

export default Review;
