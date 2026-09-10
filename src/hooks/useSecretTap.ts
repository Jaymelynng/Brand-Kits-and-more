import { useCallback, useRef, useState } from "react";

interface Options {
  /** How many taps it takes. */
  taps?: number;
  /** Taps must land within this many ms of each other or the count resets. */
  windowMs?: number;
  /** Fires on the final tap. */
  onUnlock: () => void;
}

/**
 * A tap-counted back door.
 *
 * Tap the same thing N times in a row and something opens. Any pause longer
 * than the window resets the count, so a visitor who happens to click a logo
 * twice never trips it — and there is nothing on the page saying it exists.
 *
 * Returns the handler to attach and how many taps are left, so the caller can
 * give quiet feedback once someone is clearly on purpose rather than by accident.
 */
export const useSecretTap = ({ taps = 5, windowMs = 1200, onUnlock }: Options) => {
  const count = useRef(0);
  const last = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const clear = useRef<ReturnType<typeof setTimeout>>();

  const onTap = useCallback(() => {
    const now = Date.now();
    count.current = now - last.current > windowMs ? 1 : count.current + 1;
    last.current = now;

    if (clear.current) clearTimeout(clear.current);

    if (count.current >= taps) {
      count.current = 0;
      setRemaining(null);
      onUnlock();
      return;
    }

    // Stay silent for the first couple of taps — an accidental double-click
    // should never hint that a back door is here.
    const left = taps - count.current;
    setRemaining(left <= 2 ? left : null);
    clear.current = setTimeout(() => {
      count.current = 0;
      setRemaining(null);
    }, windowMs);
  }, [taps, windowMs, onUnlock]);

  return { onTap, remaining };
};
