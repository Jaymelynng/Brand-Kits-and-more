import { useEffect, useMemo, useState, type ReactNode } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Pause, Play } from "lucide-react";
import { Carousel, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

/** Own the carousel lifecycle so rerendering a logo cannot restart its timer. */
export function LogoCarouselFrame({
  children,
  className,
  contained = false,
}: {
  children: ReactNode;
  className?: string;
  contained?: boolean;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const autoplay = useMemo(() => Autoplay({
    delay: 5000,
    playOnInit: false,
    stopOnInteraction: true,
    stopOnMouseEnter: false,
    stopOnFocusIn: false,
  }), []);
  const plugins = useMemo(() => [autoplay], [autoplay]);
  const options = useMemo(() => ({
    align: "center" as const,
    loop: true,
    containScroll: false as const,
    duration: reducedMotion ? 0 : contained ? 42 : 30,
  }), [contained, reducedMotion]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!api) return;
    let slides = api.slideNodes();
    let cards = slides.map(slide => slide.querySelector<HTMLElement>("[data-card]"));
    const updateSlides = () => {
      const selected = api.selectedScrollSnap();
      // Read the physical slide positions, including Embla's loop offsets.
      // Depth follows the same motion as the track instead of running a
      // separate CSS animation when the destination becomes selected.
      const viewport = contained ? api.rootNode().getBoundingClientRect() : null;
      const positions = contained ? slides.map(slide => slide.getBoundingClientRect()) : [];
      slides.forEach((slide, index) => {
        // Use the nearest copy around the loop, including the first/last seam.
        let distance = index - selected;
        if (distance > slides.length / 2) distance -= slides.length;
        if (distance < -slides.length / 2) distance += slides.length;
        const card = cards[index];
        slide.dataset.active = String(distance === 0);
        if (!card) return;
        if (contained && viewport && positions[index].width > 0) {
          const rect = positions[index];
          const offset = (rect.left + rect.width / 2 - viewport.left - viewport.width / 2) / rect.width;
          const proximity = Math.max(0, 1 - Math.abs(offset));
          const focus = proximity * proximity * (3 - 2 * proximity);
          const depth = 1 - focus;
          const angle = reducedMotion ? 0 : Math.sign(offset) * depth * 14;
          const scale = reducedMotion ? 1 : 1 - depth * 0.14;
          const drop = reducedMotion ? 0 : depth * 10;
          card.style.transform = `perspective(1400px) translateY(${drop.toFixed(3)}px) rotateY(${angle.toFixed(3)}deg) scale(${scale.toFixed(5)})`;
          card.style.opacity = reducedMotion ? "1" : String(1 - depth * 0.28);
          card.style.transition = "none";
          slide.style.zIndex = String(Math.round(focus * 100));
          return;
        }
        const depth = Math.abs(distance);
        const angle = reducedMotion ? 0 : Math.sign(distance) * Math.min(contained ? 12 : 45, depth * 12);
        const scale = reducedMotion ? 1 : Math.max(0.78, 1 - depth * 0.1);
        card.style.transform = `rotateY(${angle}deg) scale(${scale})`;
        card.style.opacity = String(distance === 0 ? 1 : Math.max(0.45, 1 - depth * 0.24));
        card.style.transition = reducedMotion ? "none" : "transform 420ms ease, opacity 420ms ease";
        slide.style.zIndex = String(Math.max(0, slides.length - depth));
      });
    };
    const refreshSlides = () => {
      slides = api.slideNodes();
      cards = slides.map(slide => slide.querySelector<HTMLElement>("[data-card]"));
      updateSlides();
    };
    const pointerDown = () => setDragging(true);
    const pointerUp = () => setDragging(false);
    api.on("select", updateSlides);
    api.on("reInit", refreshSlides);
    if (contained) {
      api.on("scroll", updateSlides);
      api.on("settle", updateSlides);
    }
    api.on("pointerDown", pointerDown);
    api.on("pointerUp", pointerUp);
    updateSlides();
    return () => {
      api.off("select", updateSlides);
      api.off("reInit", refreshSlides);
      api.off("scroll", updateSlides);
      api.off("settle", updateSlides);
      api.off("pointerDown", pointerDown);
      api.off("pointerUp", pointerUp);
    };
  }, [api, contained, reducedMotion]);

  useEffect(() => {
    if (!api) return;
    const syncPlayback = () => {
      if (paused || hovered || focused || dragging || reducedMotion) autoplay.stop();
      else autoplay.play();
    };
    syncPlayback();
    api.on("reInit", syncPlayback);
    return () => {
      api.off("reInit", syncPlayback);
      autoplay.stop();
    };
  }, [api, autoplay, paused, hovered, focused, dragging, reducedMotion]);

  return (
    <Carousel
      className={cn("isolate min-w-0", className)}
      aria-label={contained ? "Primary logos" : "Logo gallery"}
      data-logo-carousel={contained ? "primary" : "gallery"}
      opts={options}
      plugins={plugins}
      setApi={setApi}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onClick={(event) => {
        if (!api || !(event.target instanceof Element)) return;
        if (event.target.closest("button, a, input, textarea, select, [role=checkbox], [contenteditable=true]")) return;
        const slide = event.target.closest<HTMLElement>('[aria-roledescription="slide"]');
        if (slide) api.scrollTo(api.slideNodes().indexOf(slide));
      }}
    >
      {children}
      {!reducedMotion && (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? "Resume automatic logo rotation" : "Pause automatic logo rotation"}
          aria-pressed={paused}
          className="absolute -bottom-7 right-4 z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {paused ? "Resume" : "Pause"}
        </button>
      )}
    </Carousel>
  );
}
