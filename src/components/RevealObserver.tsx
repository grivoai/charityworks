"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Adds the `.in` class to `.reveal` elements as they scroll into view.
 *
 * Re-runs on navigation because each route renders a fresh set of elements.
 * A <noscript> rule in the layout forces `.reveal` visible when JavaScript is
 * unavailable, so content is never hidden from a client that cannot run this.
 *
 * After a client-side navigation the section swipe in AnimatedLayout is the
 * entrance animation. Anything already in the viewport is therefore revealed
 * instantly rather than running its own 800ms reveal on top — otherwise the
 * two would compound and the transition would overrun its ~460ms budget.
 * Below-the-fold elements keep the normal scroll-triggered reveal.
 */
export function RevealObserver() {
  const pathname = usePathname();
  const firstRun = useRef(true);

  useEffect(() => {
    const isFirstRun = firstRun.current;
    firstRun.current = false;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal:not(.in)")
    );
    if (targets.length === 0) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }

    let pending = targets;

    if (!isFirstRun) {
      pending = [];
      for (const el of targets) {
        const rect = el.getBoundingClientRect();
        const onScreen = rect.top < window.innerHeight && rect.bottom > 0;
        if (onScreen) {
          el.classList.add("reveal-instant", "in");
        } else {
          pending.push(el);
        }
      }
    }

    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    pending.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
