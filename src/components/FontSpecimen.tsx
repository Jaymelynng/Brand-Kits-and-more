import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Pencil, Star, Type } from "lucide-react";
import { FontPairing, useFontPairings, useGoogleFonts } from "@/hooks/useFontPairings";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FontsSection } from "@/components/FontsSection";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/copyText";
import { shade, tint, readableOn, luminance } from "@/lib/shade";

interface FontSpecimenProps {
  gymId: string;
  gymName: string;
  palette: string[];
  canEdit: boolean;
}

const weightLabel = (weight: string) => {
  const names: Record<string, string> = { "300": "Light", "400": "Regular", "500": "Medium", "600": "Semibold", "700": "Bold", "800": "Extra bold", "900": "Black" };
  return names[weight] ? `${names[weight]} · ${weight}` : `Weight ${weight}`;
};

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
  const ink = readableOn("#FFFFFF", darkest && luminance(darkest) < 0.5 ? darkest : shade(accent, 0.55));
  const light = [...palette].filter(color => luminance(color) < 0.9).sort((a, b) => luminance(b) - luminance(a))[0] || accent;
  const bodySurface = tint(light, 0.65);
  const onInk = readableOn(ink, "#FFFFFF");
  const onAccent = readableOn(accent, "#FFFFFF");
  const fontCount = new Set(pairings.flatMap(p => [p.heading_font, p.body_font, p.accent_font].filter(Boolean))).size;

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
      <div className="font-specimen-header flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: `${ink}22` }}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1 text-[15px] font-semibold" style={{ color: ink }}>
            <span className="whitespace-nowrap">{fontCount} {fontCount === 1 ? "font" : "fonts"}</span><span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">{pairings.length} {pairings.length === 1 ? "pairing" : "pairings"}</span>
          </div>
          <div className="flex items-center gap-2">
            <strong className="break-words text-[20px] leading-tight" style={{ color: ink }}>{p.name}</strong>
            {p.is_preferred && <Star className="h-4 w-4 shrink-0" style={{ color: ink, fill: accent }} aria-label="Everyday pairing" />}
          </div>
        </div>

        {pairings.length > 1 && (
          <div className="flex shrink-0 items-center gap-1">
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

      {/* Put the identity next to the sample it describes. Each family name
          and campaign example renders in that family's actual saved weight. */}
      <div className="font-specimen-sample grid flex-1 auto-rows-fr gap-3 py-3">
        {[
          { role: "Heading", font: p.heading_font, weight: p.heading_weight, sample: p.sample_heading || gymName },
          { role: "Body", font: p.body_font, weight: p.body_weight, sample: p.sample_body || "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm" },
          ...(p.accent_font ? [{ role: "Accent", font: p.accent_font, weight: p.accent_weight || "400", sample: "Aa Bb Cc 0123456789" }] : []),
        ].map(face => {
          const isHeading = face.role === "Heading";
          const surface = isHeading ? ink : bodySurface;
          const text = isHeading ? "#FFFFFF" : readableOn(surface, ink);
          return (
          <section key={face.role} data-font-role={face.role.toLowerCase()}
            className="font-specimen-face relative min-w-0 rounded-xl border p-[clamp(12px,3cqi,16px)]"
            style={{ background: surface, color: text, borderColor: isHeading ? ink : `${ink}35`, borderTop: `3px solid ${isHeading ? accent : light}`, boxShadow: `0 5px 12px -5px ${ink}66` }}
            aria-label={`${face.role} font: ${face.font}`}>
            <div className="font-specimen-face-label mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[15px] leading-snug">
              <strong>{face.role} font</strong>
              <span>{weightLabel(face.weight)}</span>
            </div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div data-font-name className="min-w-0 break-words leading-tight"
                style={{ fontFamily: `'${face.font}', sans-serif`, fontWeight: Number(face.weight), fontSize: "clamp(28px, 8cqi, 38px)", color: text }}>
                {face.font}
              </div>
              <button type="button" onClick={() => copy(`${face.font} ${face.weight}`, face.font)}
                className="font-specimen-copy flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: isHeading ? "#FFFFFF" : ink, color: isHeading ? ink : "#FFFFFF" }} aria-label={`Copy ${face.role.toLowerCase()} font: ${face.font}`} title={`Copy ${face.font}`}>
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div data-font-example className="break-words"
              style={{ fontFamily: `'${face.font}', sans-serif`, fontWeight: Number(face.weight), fontSize: isHeading ? "clamp(24px, 6cqi, 32px)" : "clamp(17px, 4cqi, 19px)", lineHeight: isHeading ? 1.2 : 1.5, textWrap: "pretty", color: text }}>
              {face.sample}
            </div>
            {face.role === "Heading" && <div className="mt-2 break-words tracking-wide"
              style={{ fontFamily: `'${face.font}', sans-serif`, fontWeight: Number(face.weight), fontSize: "clamp(18px, 4.5cqi, 22px)", color: text }}>
              ABCDEFGHIJKLM
            </div>}
          </section>
        );})}
      </div>
      {p.sample_source && <p className="mb-3 border-l-2 pl-3 text-[15px] leading-snug" style={{ color: ink, borderColor: accent, textWrap: "pretty" }}>Email example: {p.sample_source}</p>}

      <div className="font-specimen-actions mt-auto flex flex-wrap items-center justify-end gap-2 border-t pt-3" style={{ borderColor: `${ink}22` }}>
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
            <Copy className="h-4 w-4" aria-hidden="true" /> Copy pairing
          </button>
          {canEdit && editor}
      </div>
    </div>
    ))}
    </div>
  );
};
