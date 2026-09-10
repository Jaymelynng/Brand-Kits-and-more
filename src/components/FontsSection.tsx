import { useMemo, useState } from "react";
import { Check, Copy, Mail, Pencil, Plus, Star, Trash2, Type, X } from "lucide-react";
import {
  FontPairing, useFontPairings, useSaveFontPairing, useDeleteFontPairing,
  useSetPreferredPairing, useGoogleFonts,
} from "@/hooks/useFontPairings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/copyText";
import { shade, readableOn, luminance, tint } from "@/lib/shade";

interface FontsSectionProps {
  gymId: string;
  gymName: string;
  palette: string[];
  canEdit: boolean;
  /** Inside the specimen's drawer, so it drops its own card chrome. */
  embedded?: boolean;
}

const WEIGHTS = ["300", "400", "500", "600", "700", "800", "900"];

/** Stacks that survive every email client, because they ship with the OS. */
const EMAIL_FALLBACKS = [
  "Arial, Helvetica, sans-serif",
  "Georgia, 'Times New Roman', serif",
  "'Trebuchet MS', Verdana, sans-serif",
  "Verdana, Geneva, sans-serif",
  "'Courier New', Courier, monospace",
];

const BLANK = {
  name: "New pairing",
  heading_font: "Poppins",
  heading_weight: "700",
  body_font: "Inter",
  body_weight: "400",
  accent_font: "",
  accent_weight: "400",
  email_fallback: "Arial, Helvetica, sans-serif",
  notes: "",
};

/**
 * Fonts and typography per gym.
 *
 * These are starting choices rather than rules - she still picks something
 * else for a campaign - so a gym keeps several pairings and marks one as the
 * everyday one instead of the app pretending there is only ever one answer.
 *
 * The preview loads the real face from Google Fonts: a name and a weight tell
 * you nothing about whether two fonts sit well together, and that judgement
 * is the entire point of the section.
 */
export const FontsSection = ({ gymId, gymName, palette, canEdit, embedded = false }: FontsSectionProps) => {
  const { data: pairings = [], isLoading } = useFontPairings(gymId);
  const save = useSaveFontPairing();
  const remove = useDeleteFontPairing();
  const setPreferred = useSetPreferredPairing();
  const { toast } = useToast();

  const [editing, setEditing] = useState<Partial<FontPairing> | null>(null);

  const accent = palette[0] || "#41505F";
  const darkest = [...palette].sort((a, b) => luminance(a) - luminance(b))[0];
  const ink = darkest && luminance(darkest) < 0.5 ? darkest : shade(accent, 0.55);
  const onAccent = readableOn(accent, "#FFFFFF");

  // Load every face on screen, including the one being edited right now, so
  // the preview updates as she types a font name.
  const families = useMemo(() => {
    const list = pairings.flatMap(p => [p.heading_font, p.body_font, p.accent_font || ""]);
    if (editing) list.push(editing.heading_font || "", editing.body_font || "", editing.accent_font || "");
    return [...new Set(list.filter(Boolean))] as string[];
  }, [pairings, editing]);
  useGoogleFonts(families);

  const copy = (text: string, what: string) => {
    copyText(text).then(ok =>
      toast({
        description: ok ? `${what} copied` : "Your browser blocked the clipboard",
        variant: ok ? undefined : "destructive",
      })
    );
  };

  const namesOf = (p: FontPairing) =>
    [
      `Heading: ${p.heading_font} ${p.heading_weight}`,
      `Body: ${p.body_font} ${p.body_weight}`,
      p.accent_font ? `Accent: ${p.accent_font} ${p.accent_weight || "400"}` : null,
      `Email fallback: ${p.email_fallback}`,
    ].filter(Boolean).join("\n");

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading fonts...</p>;
  }

  const Shell = embedded
    ? ({ children }: { children: React.ReactNode }) => <div className="space-y-4">{children}</div>
    : ({ children }: { children: React.ReactNode }) => (
        <Card className="mb-6 bg-white shadow-xl border-2" style={{ borderColor: `${accent}40` }}>
          {children}
        </Card>
      );
  const Head = embedded
    ? ({ children }: { children: React.ReactNode }) => <div>{children}</div>
    : CardHeader;
  const Body = embedded
    ? ({ children }: { children: React.ReactNode }) => <div className="space-y-4">{children}</div>
    : CardContent;

  return (
    <Shell>
      <Head>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Type className="h-5 w-5" style={{ color: accent }} />
              Fonts &amp; typography
            </CardTitle>
            <span className="text-sm font-semibold text-muted-foreground">
              {pairings.length === 0
                ? "nothing saved yet"
                : `${pairings.length} pairing${pairings.length === 1 ? "" : "s"}`}
            </span>
          </div>
          {canEdit && (
            <Button
              onClick={() => setEditing({ ...BLANK })}
              size="sm"
              className="font-bold text-white"
              style={{ background: accent, color: onAccent }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add pairing
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Starting choices, not rules — the everyday pairing is marked, and anything
          else here is fair game for a campaign.
        </p>
      </Head>

      <Body>
        {pairings.length === 0 && !editing && (
          <p className="rounded-xl border-2 border-dashed p-6 text-center text-sm font-semibold text-muted-foreground">
            No fonts saved for {gymName} yet.
          </p>
        )}

        {pairings.map(p => (
          <div
            key={p.id}
            className="rounded-2xl border-2 p-4"
            style={{
              borderColor: p.is_preferred ? accent : "#E3E8EE",
              boxShadow: p.is_preferred ? `0 8px 20px ${accent}33` : "0 1px 2px rgba(16,24,32,0.06)",
            }}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-base font-extrabold" style={{ color: ink }}>{p.name}</span>
              {p.is_preferred && (
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                  style={{ background: accent, color: onAccent }}
                >
                  <Star className="h-3 w-3" /> Everyday pairing
                </span>
              )}
              <div className="ml-auto flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => copy(namesOf(p), "Font names")}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy names
                </Button>
                {canEdit && !p.is_preferred && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreferred.mutate({ gymId, id: p.id }, {
                      onSuccess: () => toast({ description: `${p.name} is the everyday pairing` }),
                    })}
                  >
                    <Star className="mr-1 h-3.5 w-3.5" /> Make everyday
                  </Button>
                )}
                {canEdit && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!window.confirm(`Delete the "${p.name}" pairing?`)) return;
                        remove.mutate(p.id, { onSuccess: () => toast({ description: `Deleted ${p.name}` }) });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* The actual type, at the actual weight. */}
            <div className="rounded-xl p-4" style={{ background: tint(ink, 0.95) }}>
              <div
                className="mb-2 leading-tight"
                style={{ fontFamily: `'${p.heading_font}', sans-serif`, fontWeight: Number(p.heading_weight), fontSize: 30, color: ink, textWrap: "balance" }}
              >
                {p.sample_heading || gymName}
              </div>
              <div
                style={{ fontFamily: `'${p.body_font}', sans-serif`, fontWeight: Number(p.body_weight), fontSize: 15, color: shade(ink, 0.05), lineHeight: 1.65, textWrap: "balance" }}
              >
                {p.sample_body || "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789"}
              </div>
              {p.accent_font && (
                <div
                  className="mt-3"
                  style={{ fontFamily: `'${p.accent_font}', cursive`, fontWeight: Number(p.accent_weight || 400), fontSize: 24, color: accent }}
                >
                  Aa Bb Cc 0123456789
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Heading", p.heading_font, p.heading_weight],
                ["Body", p.body_font, p.body_weight],
                ...(p.accent_font ? [["Accent", p.accent_font, p.accent_weight || "400"]] : []),
              ].map(([role, font, weight]) => (
                <button
                  key={role as string}
                  onClick={() => copy(`${font} ${weight}`, font as string)}
                  className="rounded-lg border-2 p-2.5 text-left transition-colors hover:bg-muted"
                  style={{ borderColor: "#E3E8EE" }}
                >
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {role}
                  </div>
                  <div className="truncate text-sm font-bold" style={{ color: ink }}>{font}</div>
                  <div className="text-xs font-semibold text-muted-foreground">Weight {weight}</div>
                </button>
              ))}

              <button
                onClick={() => copy(p.email_fallback, "Email fallback")}
                className="rounded-lg border-2 p-2.5 text-left transition-colors hover:bg-muted"
                style={{ borderColor: `${accent}55`, background: `${accent}0F` }}
              >
                <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <Mail className="h-3 w-3" /> Email fallback
                </div>
                <div className="truncate text-sm font-bold" style={{ color: ink }} title={p.email_fallback}>
                  {p.email_fallback}
                </div>
                <div
                  className="truncate text-xs"
                  style={{ fontFamily: p.email_fallback, color: shade(ink, 0.05) }}
                >
                  This is how it reads without the real font
                </div>
              </button>
            </div>

            {p.notes && (
              <p className="mt-2 text-xs font-medium text-muted-foreground">{p.notes}</p>
            )}
          </div>
        ))}

        {editing && canEdit && (
          <div className="rounded-2xl border-2 p-4" style={{ borderColor: accent }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-extrabold" style={{ color: ink }}>
                {editing.id ? "Edit pairing" : "New pairing"}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                Pairing name
                <Input
                  value={editing.name || ""}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Everyday"
                  className="mt-1"
                />
              </label>

              <label className="text-xs font-bold">
                Email fallback
                <select
                  value={editing.email_fallback || EMAIL_FALLBACKS[0]}
                  onChange={e => setEditing({ ...editing, email_fallback: e.target.value })}
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {EMAIL_FALLBACKS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>

              {([
                ["Heading font", "heading_font", "heading_weight"],
                ["Body font", "body_font", "body_weight"],
                ["Accent font (optional)", "accent_font", "accent_weight"],
              ] as const).map(([label, fontKey, weightKey]) => (
                <div key={fontKey} className="flex gap-2">
                  <label className="flex-1 text-xs font-bold">
                    {label}
                    <Input
                      value={(editing as never)[fontKey] || ""}
                      onChange={e => setEditing({ ...editing, [fontKey]: e.target.value })}
                      placeholder="Google Fonts name, e.g. Poppins"
                      className="mt-1"
                    />
                  </label>
                  <label className="w-24 text-xs font-bold">
                    Weight
                    <select
                      value={(editing as never)[weightKey] || "400"}
                      onChange={e => setEditing({ ...editing, [weightKey]: e.target.value })}
                      className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
                    >
                      {WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </label>
                </div>
              ))}

              {([['Sample headline', 'sample_heading', 140], ['Sample body', 'sample_body', 400], ['Sample source', 'sample_source', 240]] as const).map(([label, key, maxLength]) => (
                <label key={key} className="text-xs font-bold sm:col-span-2">
                  {label}
                  <Input className="mt-1" value={editing[key] || ''} maxLength={maxLength}
                    onChange={e => setEditing({ ...editing, [key]: e.target.value })} />
                </label>
              ))}
              <label className="text-xs font-bold sm:col-span-2">
                Note (optional)
                <Input
                  value={editing.notes || ""}
                  onChange={e => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Where this pairing is meant to be used"
                  className="mt-1"
                />
              </label>
            </div>

            {/* Live, so she can judge the pair before saving it. */}
            {editing.heading_font && editing.body_font && (
              <div className="mt-3 rounded-xl p-4" style={{ background: tint(ink, 0.95) }}>
                <div style={{ fontFamily: `'${editing.heading_font}', sans-serif`, fontWeight: Number(editing.heading_weight || 700), fontSize: 28, color: ink, textWrap: "balance" }}>
                  {editing.sample_heading || gymName}
                </div>
                <div style={{ fontFamily: `'${editing.body_font}', sans-serif`, fontWeight: Number(editing.body_weight || 400), fontSize: 15, color: shade(ink, 0.05), lineHeight: 1.6, textWrap: "balance" }}>
                  {editing.sample_body || "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789"}
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button
                disabled={!editing.heading_font?.trim() || !editing.body_font?.trim() || save.isPending}
                onClick={() => {
                  save.mutate(
                    {
                      ...editing,
                      gym_id: gymId,
                      accent_font: editing.accent_font?.trim() || null,
                      order_index: editing.order_index ?? pairings.length,
                    } as never,
                    {
                      onSuccess: () => {
                        toast({ description: editing.id ? "Pairing updated" : "Pairing saved" });
                        setEditing(null);
                      },
                      onError: () => toast({ variant: "destructive", description: "Could not save that" }),
                    }
                  );
                }}
                style={{ background: accent, color: onAccent }}
                className="font-bold"
              >
                <Check className="mr-1 h-4 w-4" /> Save pairing
              </Button>
            </div>
          </div>
        )}
      </Body>
    </Shell>
  );
};
