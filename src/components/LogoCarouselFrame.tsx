import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Carousel, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type LogoNavigation = { id: string; label: string; preview: ReactNode };

/** One motion lifecycle for the primary showcase and the gallery carousel. */
export function LogoCarouselFrame({
  children, className, contained = false, navigation = [], suspended = false,
}: {
  children: ReactNode;
  className?: string;
  contained?: boolean;
  navigation?: LogoNavigation[];
  suspended?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [playing, setPlaying] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const autoplay = useMemo(() => Autoplay({
    delay: 6000, playOnInit: false, stopOnInteraction: true,
    stopOnMouseEnter: false, stopOnFocusIn: false,
  }), []);
  const plugins = useMemo(() => [autoplay], [autoplay]);
  const options = useMemo(() => ({
    align: "center" as const, loop: true, containScroll: false as const,
    duration: reducedMotion ? 0 : contained ? 38 : 30,
  }), [contained, reducedMotion]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    const updateVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.1);
    }, { threshold: [0, 0.1] });
    // A tall card can never be 35% visible on some landscape phones.
    const viewport = frameRef.current?.querySelector("[data-carousel-viewport]") || frameRef.current;
    if (viewport) observer.observe(viewport);
    return () => {
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", updateVisibility);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!api) return;
    const select = () => setSelected(api.selectedScrollSnap());
    const play = () => setPlaying(true);
    const stop = () => setPlaying(false);
    const timer = () => setTimerKey(value => value + 1);
    api.on("select", select).on("reInit", select);
    api.on("autoplay:play", play).on("autoplay:stop", stop).on("autoplay:timerset", timer);
    select();
    return () => {
      api.off("select", select).off("reInit", select);
      api.off("autoplay:play", play).off("autoplay:stop", stop).off("autoplay:timerset", timer);
    };
  }, [api]);

  const current = navigation.length ? selected % navigation.length : selected;
  useEffect(() => {
    // Scroll only the thumbnail strip, never the page around the showcase.
    const strip = stripRef.current;
    const thumb = strip?.children[current] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    strip.scrollTo({
      left: thumb.offsetLeft - strip.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [current, reducedMotion]);

  const goTo = (index: number) => {
    if (!api || !navigation.length) return;
    const total = api.slideNodes().length;
    const from = api.selectedScrollSnap();
    const copies = api.slideNodes().map((_, i) => i).filter(i => i % navigation.length === index);
    const distance = (i: number) => Math.min(Math.abs(i - from), total - Math.abs(i - from));
    const nearest = copies.reduce((best, i) => distance(i) < distance(best) ? i : best, copies[0]);
    api.scrollTo(nearest);
    autoplay.reset();
  };

  useEffect(() => {
    if (!api) return;
    let slides = api.slideNodes();
    let cards = slides.map(slide => slide.querySelector<HTMLElement>("[data-card]"));
    const updateSlides = () => {
      const selected = api.selectedScrollSnap();
      const viewport = contained ? api.rootNode().getBoundingClientRect() : null;
      // Batch layout reads before transform writes. Embla supplies loop offsets.
      const positions = contained ? slides.map(slide => slide.getBoundingClientRect()) : [];
      slides.forEach((slide, index) => {
        let distance = index - selected;
        if (distance > slides.length / 2) distance -= slides.length;
        if (distance < -slides.length / 2) distance += slides.length;
        const card = cards[index];
        slide.dataset.active = String(distance === 0);
        if (!card) return;
        if (contained) {
          slide.setAttribute("aria-hidden", String(distance !== 0));
          card.inert = distance !== 0;
        }
        if (contained && viewport && positions[index].width > 0) {
          const rect = positions[index];
          const offset = (rect.left + rect.width / 2 - viewport.left - viewport.width / 2) / rect.width;
          const proximity = Math.max(0, 1 - Math.abs(offset));
          const focus = proximity * proximity * (3 - 2 * proximity);
          const depth = 1 - focus;
          const angle = reducedMotion ? 0 : -Math.sign(offset) * depth * 24;
          const scale = reducedMotion ? 1 : 1 - depth * 0.18;
          const drop = reducedMotion ? 0 : depth * 15;
          const tuck = reducedMotion ? 0 : -Math.max(-1, Math.min(1, offset)) * rect.width * 0.08;
          card.style.transform = `perspective(1600px) translate3d(${tuck.toFixed(3)}px,${drop.toFixed(3)}px,0) rotateY(${angle.toFixed(3)}deg) scale(${scale.toFixed(5)})`;
          card.style.opacity = reducedMotion ? "1" : String(1 - depth * 0.36);
          card.style.setProperty("--logo-focus", focus.toFixed(4));
          card.style.transition = "none";
          slide.style.zIndex = String(Math.round(focus * 100));
          return;
        }
        const depth = Math.abs(distance);
        const angle = reducedMotion ? 0 : Math.sign(distance) * Math.min(45, depth * 12);
        const scale = reducedMotion ? 1 : Math.max(0.78, 1 - depth * 0.1);
        card.style.transform = `rotateY(${angle}deg) scale(${scale})`;
        card.style.opacity = String(distance === 0 ? 1 : Math.max(0.45, 1 - depth * 0.24));
        card.style.transition = reducedMotion ? "none" : "transform 420ms ease, opacity 420ms ease";
        slide.style.zIndex = String(Math.max(0, slides.length - depth));
      });
    };
    const refresh = () => {
      slides = api.slideNodes();
      cards = slides.map(slide => slide.querySelector<HTMLElement>("[data-card]"));
      updateSlides();
    };
    const down = () => setDragging(true);
    const up = () => setDragging(false);
    api.on("select", updateSlides).on("reInit", refresh);
    if (contained) api.on("scroll", updateSlides).on("settle", updateSlides);
    api.on("pointerDown", down).on("pointerUp", up);
    updateSlides();
    return () => {
      api.off("select", updateSlides).off("reInit", refresh);
      api.off("scroll", updateSlides).off("settle", updateSlides);
      api.off("pointerDown", down).off("pointerUp", up);
    };
  }, [api, contained, reducedMotion]);

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      if (paused || focused || dragging || reducedMotion || suspended || !visible || !pageVisible || api.scrollSnapList().length < 2) autoplay.stop();
      else autoplay.play();
    };
    sync();
    api.on("reInit", sync);
    return () => { api.off("reInit", sync); autoplay.stop(); };
  }, [api, autoplay, paused, focused, dragging, reducedMotion, suspended, visible, pageVisible]);

  const togglePlayback = () => { setFocused(false); setPaused(value => !value); };

  return (
    <Carousel ref={frameRef} className={cn("isolate min-w-0", className)}
      aria-label={contained ? "Primary logos" : "Logo gallery"}
      data-logo-carousel={contained ? "primary" : "gallery"}
      data-playing={playing} data-current-logo={current}
      opts={options} plugins={plugins} setApi={setApi}
      onPointerDownCapture={(event) => {
        // Pointer focus on an arrow or thumbnail must not latch rotation off.
        setFocused(false);
        gestureRef.current = (event.target as Element).closest('[data-carousel-viewport]')
          ? { x: event.clientX, y: event.clientY, moved: false } : null;
      }}
      onPointerMoveCapture={(event) => {
        const gesture = gestureRef.current;
        if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10) gesture.moved = true;
      }}
      onFocusCapture={(event) => {
        const target = event.target as Element;
        setFocused(target.matches(":focus-visible") && !target.closest("[data-playback-control]"));
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onClickCapture={(event) => {
        // A drag's final click must not select the slide under the pointer.
        // React capture runs before Embla's native click suppression.
        if (event.detail > 0 && gestureRef.current?.moved) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!contained || !api || !(event.target instanceof Element)) return;
        const slide = event.target.closest<HTMLElement>('[aria-roledescription="slide"][data-active="false"]');
        if (!slide) return;
        event.stopPropagation();
        api.scrollTo(api.slideNodes().indexOf(slide));
        autoplay.reset();
      }}
      onClick={(event) => {
        if (!api || !(event.target instanceof Element)) return;
        if (event.target.closest("button, a, input, textarea, select, [role=checkbox], [contenteditable=true]")) return;
        const slide = event.target.closest<HTMLElement>('[aria-roledescription="slide"]');
        if (slide) api.scrollTo(api.slideNodes().indexOf(slide));
      }}
    >
      {children}
      {contained && navigation.length > 1 ? (
        <div className="primary-logo-navigation">
          <div ref={stripRef} className="primary-logo-thumbnails" role="group" aria-label="Choose a primary logo">
            {navigation.map((logo, index) => (
              <button key={logo.id} type="button" className="primary-logo-thumbnail"
                aria-label={`Show ${logo.label}`} aria-pressed={index === current}
                title={logo.label} onClick={() => goTo(index)}>{logo.preview}</button>
            ))}
          </div>
          <div className="primary-logo-controls">
            <span className="primary-logo-counter" aria-label={`Logo ${current + 1} of ${navigation.length}`}>
              <strong>{String(current + 1).padStart(2, "0")}</strong><span aria-hidden="true"> / </span>{String(navigation.length).padStart(2, "0")}
            </span>
            <div className="primary-logo-buttons">
              <button type="button" className="primary-logo-control" aria-label="Previous slide" onClick={() => { api?.scrollPrev(); autoplay.reset(); }}><ArrowLeft aria-hidden="true" /></button>
              {!reducedMotion && <button type="button" data-playback-control className="primary-logo-control primary-logo-playback"
                aria-label={paused ? "Resume automatic logo rotation" : "Pause automatic logo rotation"} aria-pressed={paused} onClick={togglePlayback}>
                <svg className="primary-logo-timer" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" /><circle key={timerKey} className="primary-logo-timer-progress" cx="22" cy="22" r="20" pathLength="100" style={{ animationPlayState: playing ? "running" : "paused" }} /></svg>
                {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              </button>}
              <button type="button" className="primary-logo-control" aria-label="Next slide" onClick={() => { api?.scrollNext(); autoplay.reset(); }}><ArrowRight aria-hidden="true" /></button>
            </div>
          </div>
        </div>
      ) : !contained && !reducedMotion && (
        <button type="button" data-playback-control onClick={togglePlayback}
          aria-label={paused ? "Resume automatic logo rotation" : "Pause automatic logo rotation"} aria-pressed={paused}
          className="absolute -bottom-7 right-4 z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}{paused ? "Resume" : "Pause"}
        </button>
      )}
    </Carousel>
  );
}
