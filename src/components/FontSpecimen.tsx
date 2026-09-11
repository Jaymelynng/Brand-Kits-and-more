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

  const activeIndex = Math.min(index, Math.max(0, pairings.length - 1));

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

  if (!pairings.length) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center rounded-2xl p-6 text-center"
        style={{ background: ink, color: onInk, minHeight: 260 }}
      >
        <Type className="mb-2 h-6 w-6" style={{ color: accent }} />
        <div className="text-sm font-bold">No fonts saved yet</div>
        {canEdit && <div className="mt-3">{editor}</div>}
      </div>
    );
  }

  return (
    // Overlapping grid cells reserve the tallest pairing's natural height.
    // Hidden pairings still size the card, but cannot be seen or tabbed into.
    <div className="grid min-w-0 flex-1 py-[18px]" data-font-specimen>
    {pairings.map((p: FontPairing, panelIndex) => (
    <div
      key={p.id}
      data-font-pairing={p.id}
      data-active={panelIndex === activeIndex}
      aria-hidden={panelIndex !== activeIndex}
      className="col-start-1 row-start-1 flex min-w-0 flex-col rounded-2xl p-[clamp(14px,1.6vw,24px)]"
      style={{
        visibility: panelIndex === activeIndex ? "visible" : "hidden",
        containerType: "inline-size",
        // The card behind this is already the gym's dark tone, so a dark panel
        // on it was invisible - the same colour as its own background. White
        // makes the specimen an object on that ground, and gives the type the
        // contrast it needs to actually be judged.
        background: "#FFFFFF",
        color: ink,
        boxShadow: `0 10px 30px rgba(0,0,0,0.28), inset 0 0 0 2px ${accent}`,
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="text-[15px] font-extrabold uppercase tracking-wider"
          style={{ color: ink }}
        >
          Typeface
        </span>
        <span className="text-[15px] font-bold" style={{ color: ink }}>
          {p.name}
        </span>
        {p.is_preferred && (
          <Star className="h-3 w-3 shrink-0" style={{ color: accent }} aria-label="Everyday pairing" />
        )}

        {pairings.length > 1 && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setIndex(i => (i - 1 + pairings.length) % pairings.length)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:brightness-90"
              style={{ background: `${ink}14`, color: ink }}
              aria-label="Previous pairing"
              title="Previous pairing"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[15px] font-bold tabular-nums" style={{ color: ink }}>
              {panelIndex + 1}/{pairings.length}
            </span>
            <button
              onClick={() => setIndex(i => (i + 1) % pairings.length)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:brightness-90"
              style={{ background: `${ink}14`, color: ink }}
              aria-label="Next pairing"
              title="Next pairing"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Size type against this column, and balance the saved email copy
          without inserting hard line breaks that fail at another width. */}
      <div className="font-specimen-sample flex flex-1 flex-col justify-center gap-4 py-5">
        <div
          className="break-words leading-[1.02]"
          style={{
            fontFamily: `'${p.heading_font}', sans-serif`,
            fontWeight: Number(p.heading_weight),
            fontSize: p.sample_heading ? "clamp(30px, 11cqi, 58px)" : "clamp(42px, 12cqi, 82px)",
            textWrap: "balance",
            color: ink,
          }}
        >
          {p.sample_heading || gymName}
        </div>
        <div
          style={{
            fontFamily: `'${p.body_font}', sans-serif`,
            fontWeight: Number(p.body_weight),
            fontSize: "clamp(16px, 4cqi, 19px)",
            lineHeight: 1.6,
            textWrap: "balance",
            color: ink,
            opacity: 0.88,
          }}
        >
          {p.sample_body || "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789"}
        </div>
        {/* A short sample keeps the letterforms visible without another row. */}
        <div
          className="break-all tracking-wide"
          style={{
            fontFamily: `'${p.heading_font}', sans-serif`,
            fontWeight: Number(p.heading_weight),
            fontSize: "clamp(15px, 5cqi, 24px)",
            color: accent,
            opacity: 1,
          }}
        >
          ABCDEFGHIJKLM
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
            Aa Bb Cc 0123456789
          </div>
        )}
        {p.sample_source && <p className="border-l-2 pl-3 text-[15px] leading-snug" style={{ color: ink, borderColor: accent, textWrap: 'balance' }}>Campaign example · {p.sample_source}</p>}
      </div>

      {/* Names and controls, compact, under the sample. */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t pt-2.5" style={{ borderColor: `${ink}22` }}>
        <button
          onClick={() => copy(`${p.heading_font} ${p.heading_weight}`, p.heading_font)}
          className="min-h-11 cursor-pointer rounded-lg px-2.5 py-2 text-[15px] font-bold hover:brightness-90"
          style={{ background: `${ink}14`, color: ink }}
          title="Copy heading font"
        >
          {p.heading_font} {p.heading_weight}
        </button>
        <button
          onClick={() => copy(`${p.body_font} ${p.body_weight}`, p.body_font)}
          className="min-h-11 cursor-pointer rounded-lg px-2.5 py-2 text-[15px] font-bold hover:brightness-90"
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
            className="flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-2 text-[15px] font-extrabold hover:brightness-90"
            style={{ background: accent, color: onAccent }}
            title="Copy all font names"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
          {canEdit && editor}
        </div>
      </div>
    </div>
    ))}
    </div>
  );
};
