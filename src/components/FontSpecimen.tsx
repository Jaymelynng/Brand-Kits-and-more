import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Pencil, Star, Type } from "lucide-react";
import { FontPairing, useFontPairings, useGoogleFonts } from "@/hooks/useFontPairings";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FontsSection } from "@/components/FontsSection";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/copyText";
import { shade, readableOn, luminance } from "@/lib/shade";

interface FontSpecimenProps {
  gymId: string;
  gymName: string;
  palette: string[];
  canEdit: boolean;
}

/**
 * The type specimen, sized to sit beside the logo carousel rather than under
 * it as another full-width block.
 *
 * Fonts had their own slab down the page, which pushed the logos below the
 * fold - the thing she opens the kit for was the thing she had to scroll
 * past a wall of type to reach. One pairing at a time, arrows to move
 * between them, on the gym's own dark ground so the type is the brand rather
 * than a list of font names.
 */
export const FontSpecimen = ({ gymId, gymName, palette, canEdit }: FontSpecimenProps) => {
  const { data: pairings = [] } = useFontPairings(gymId);
  const [index, setIndex] = useState(0);
  const { toast } = useToast();

  // Preferred first, so the everyday pairing is what the panel opens on.
  useEffect(() => {
    const preferred = pairings.findIndex(p => p.is_preferred);
    if (preferred > 0) setIndex(preferred);
  }, [pairings.length]);

  useGoogleFonts(pairings.flatMap(p => [p.heading_font, p.body_font, p.accent_font || ""]));

  const accent = palette[0] || "#41505F";
  const darkest = [...palette].sort((a, b) => luminance(a) - luminance(b))[0];
  const ink = darkest && luminance(darkest) < 0.5 ? darkest : shade(accent, 0.55);
  const onInk = readableOn(ink, "#FFFFFF");
  const onAccent = readableOn(accent, "#FFFFFF");

  const p: FontPairing | undefined = pairings[index];

  const copy = (text: string, what: string) =>
    copyText(text).then(ok =>
      toast({
        description: ok ? `${what} copied` : "Your browser blocked the clipboard",
        variant: ok ? undefined : "destructive",
      })
    );

  const editor = (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
          style={{ background: `${ink}14`, color: ink }}
          title="Edit pairings"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" style={{ color: accent }} /> Fonts for {gymName}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {/* One editor, reused - the panel is the specimen, this is the bench. */}
          <FontsSection gymId={gymId} gymName={gymName} palette={palette} canEdit={canEdit} embedded />
        </div>
      </SheetContent>
    </Sheet>
  );

  if (!p) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl p-6 text-center"
        style={{ background: ink, color: onInk, minHeight: 260 }}
      >
        <Type className="mb-2 h-6 w-6" style={{ color: accent }} />
        <div className="text-sm font-bold">No fonts saved yet</div>
        {canEdit && <div className="mt-3">{editor}</div>}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col rounded-2xl p-5"
      style={{
        // The card behind this is already the gym's dark tone, so a dark panel
        // on it was invisible - the same colour as its own background. White
        // makes the specimen an object on that ground, and gives the type the
        // contrast it needs to actually be judged.
        background: "#FFFFFF",
        color: ink,
        boxShadow: `0 10px 30px rgba(0,0,0,0.28), inset 0 0 0 2px ${accent}`,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="text-[10px] font-extrabold uppercase tracking-widest"
          style={{ color: accent }}
        >
          Typeface
        </span>
        <span className="truncate text-[12px] font-bold" style={{ color: ink }}>
          {p.name}
        </span>
        {p.is_preferred && (
          <Star className="h-3 w-3 shrink-0" style={{ color: accent }} aria-label="Everyday pairing" />
        )}

        {pairings.length > 1 && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setIndex(i => (i - 1 + pairings.length) % pairings.length)}
              className="rounded-full p-1"
              style={{ background: `${ink}14`, color: ink }}
              aria-label="Previous pairing"
              title="Previous pairing"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: ink, opacity: 0.7 }}>
              {index + 1}/{pairings.length}
            </span>
            <button
              onClick={() => setIndex(i => (i + 1) % pairings.length)}
              className="rounded-full p-1"
              style={{ background: `${ink}14`, color: ink }}
              aria-label="Next pairing"
              title="Next pairing"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* The specimen fills the panel rather than sitting at the top of it.
          The panel is as tall as the logo carousel beside it, so left to its
          natural height the type sat in the top third with a void beneath. */}
      <div className="flex flex-col gap-3 py-1">
        <div
          className="leading-[0.92]"
          style={{
            fontFamily: `'${p.heading_font}', sans-serif`,
            fontWeight: Number(p.heading_weight),
            fontSize: "clamp(44px, 5.4vw, 82px)",
            color: ink,
          }}
        >
          {gymName}
        </div>
        <div
          style={{
            fontFamily: `'${p.body_font}', sans-serif`,
            fontWeight: Number(p.body_weight),
            fontSize: 17,
            lineHeight: 1.7,
            color: ink,
            opacity: 0.88,
          }}
        >
          Classes for every age and level, from first steps on the floor to
          competitive team. Come and see the gym for yourself.
        </div>
        {/* The alphabet, which is what a specimen is actually for. */}
        <div
          className="tracking-wide"
          style={{
            fontFamily: `'${p.heading_font}', sans-serif`,
            fontWeight: Number(p.heading_weight),
            fontSize: 22,
            color: accent,
            opacity: 1,
          }}
        >
          ABCDEFGHIJKLM NOPQRSTUVWXYZ 0123456789
        </div>
        {p.accent_font && (
          <div
            className="mt-2"
            style={{
              fontFamily: `'${p.accent_font}', cursive`,
              fontWeight: Number(p.accent_weight || 400),
              fontSize: 20,
              color: accent,
            }}
          >
            Summer camp starts June 3rd
          </div>
        )}
      </div>

      {/* Names and controls, compact, under the sample. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2.5" style={{ borderColor: `${ink}22` }}>
        <button
          onClick={() => copy(`${p.heading_font} ${p.heading_weight}`, p.heading_font)}
          className="rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ background: `${ink}14`, color: ink }}
          title="Copy heading font"
        >
          {p.heading_font} {p.heading_weight}
        </button>
        <button
          onClick={() => copy(`${p.body_font} ${p.body_weight}`, p.body_font)}
          className="rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ background: `${ink}14`, color: ink }}
          title="Copy body font"
        >
          {p.body_font} {p.body_weight}
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() =>
              copy(
                [
                  `Heading: ${p.heading_font} ${p.heading_weight}`,
                  `Body: ${p.body_font} ${p.body_weight}`,
                  p.accent_font ? `Accent: ${p.accent_font} ${p.accent_weight || "400"}` : null,
                  `Email fallback: ${p.email_fallback}`,
                ].filter(Boolean).join("\n"),
                "Pairing"
              )
            }
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
            style={{ background: accent, color: onAccent }}
            title="Copy all font names"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
          {canEdit && editor}
        </div>
      </div>
    </div>
  );
};
