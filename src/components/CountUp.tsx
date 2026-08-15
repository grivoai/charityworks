"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a stat value up from zero on the home page's first-load intro.
 *
 * The final value is what renders on the server and what a client without JS
 * (or with reduced motion, or on a repeat visit) sees — the count-up only ever
 * replaces an already-correct number, so nothing here is load-bearing for SEO
 * or accessibility. It animates only when the one-shot `data-home-intro="play"`
 * flag set by the hero's inline script is still present, which is true for the
 * first paint of a session and is cleared shortly after, so a client-side
 * navigation back to the home page shows the final figure without replaying.
 *
 * The numeric run inside the string is animated in place; any prefix ("$"),
 * suffix ("+", " States") and thousands separators are preserved.
 */
function parseValue(value: string): { prefix: string; target: number; suffix: string } | null {
  const match = value.match(/^(\D*)([\d,]+)(.*)$/);
  if (!match) return null;
  const target = Number.parseInt(match[2].replace(/,/g, ""), 10);
  if (!Number.isFinite(target)) return null;
  return { prefix: match[1], target, suffix: match[3] };
}

export function CountUp({ value, duration = 1000 }: { value: string; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const parsed = parseValue(value);
    const playing =
      document.documentElement.dataset.homeIntro === "play" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!parsed || !playing) return; // leave the final value in place

    const { prefix, target, suffix } = parsed;
    const format = (n: number) => `${prefix}${n.toLocaleString("en-US")}${suffix}`;

    let raf = 0;
    const start = performance.now();
    setDisplay(format(0));
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic — fast then settling
      setDisplay(format(Math.round(eased * target)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}
