"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Adds the `.in` class to `.reveal` elements as they scroll into view.
 *
 * Because `in` is applied imperatively, React holds no record of it: any
 * `.reveal` element whose className is derived from state will have the whole
 * class attribute rewritten on the next render, silently dropping `in` and
 * leaving the element stuck at `opacity: 0`. Keep className constant on
 * `.reveal` elements and express state as an attribute instead — see
 * FaqAccordion, which styles its open state from aria-expanded for this reason.
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

    /**
     * Decide, up front, which elements to animate on scroll and which to just
     * show. An IntersectionObserver only fires when an element *enters* the
     * viewport, so anything already sitting *above* it will never trigger — and
     * on a slow load, where the observer attaches long after paint, a visitor
     * can scroll well past a section before it is ever observed, leaving it
     * stuck at opacity 0. So snap those to visible now rather than observe them.
     */
    const pending: HTMLElement[] = [];
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      const scrolledPast = rect.bottom <= 0;
      const inView = rect.top < window.innerHeight && rect.bottom > 0;

      // Snap (no animation) anything the visitor cannot actually watch fade in:
      //   - always: elements already scrolled past — the stuck-at-0 bug; and
      //   - after a client-side nav: in-view elements too, since AnimatedLayout
      //     is already playing the entrance for what is on screen.
      if (scrolledPast || (!isFirstRun && inView)) {
        el.classList.add("reveal-instant", "in");
      } else {
        pending.push(el);
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
