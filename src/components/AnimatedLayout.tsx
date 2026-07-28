"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Directional swipe page transition.
 *
 * On an internal link click the current content slides left and fades, then the
 * route changes and the new page's top-level sections swipe in from the right,
 * staggered so the page assembles piece by piece.
 *
 *   0ms ── exit (slide -24px, fade) ── 110ms ── router.push()
 *   110ms ── §1 in ── §2 (+38ms) ── §3 (+76ms) ── §4 (+114ms) ── §5+ (+152ms)
 *   last section settles at ~462ms
 *
 * Why clicks are intercepted rather than using AnimatePresence: the App Router
 * replaces the routed subtree before AnimatePresence can animate the outgoing
 * tree, so exit animations otherwise require a "FrozenRouter" built on Next.js
 * private internals. Intercepting the click uses only public APIs and gives
 * exact control over when the navigation fires — which is what makes the
 * ~460ms budget achievable.
 *
 * Only <main>'s contents animate. The nav and footer are siblings of <main>, so
 * they stay put. That also matters technically: a transform on an ancestor
 * re-anchors `position: fixed` descendants to that ancestor rather than the
 * viewport, which would break the fixed nav and the mobile drawer.
 */

/**
 * Timing. These two are the authoritative values for the exit and the stagger;
 * the per-section travel distance and duration live in globals.css as
 * --swipe-distance / --swipe-duration.
 *
 * Budget check: exit 200ms + ~40ms route-change overhead (React render, push,
 * mount) + last stagger delay 240ms + section duration 260ms ≈ 740ms, sitting
 * mid-range of the 600-900ms target with headroom for run-to-run variance.
 */
const EXIT_SECONDS = 0.26;
const STAGGER_STEP_MS = 60;
/** Sections past this index share the last delay, bounding total sequence time. */
const MAX_STAGGER_INDEX = 4;
/**
 * Exit travel and opacity floor.
 *
 * Expressed as a percentage of the wrapper's own width so the outgoing page
 * genuinely departs on any viewport. An earlier version used a fixed -70px
 * with opacity 0.9, which on a 1000px viewport moved under 4% of the screen —
 * the page barely twitched, and then 98% of the pixels changed in a single
 * frame at the route swap. That full-screen instantaneous replacement is what
 * reads as a flash, regardless of the entrance animating correctly afterward.
 *
 * Travelling this far uncovers the area behind the wrapper, which is why
 * `is-transitioning` paints a backdrop on <main> (see globals.css). The
 * backdrop lives on <main> rather than the wrapper because the wrapper is the
 * thing moving — its own background would slide away with it.
 */
const EXIT_X = "-32%";
const EXIT_OPACITY = 0.35;

export function AnimatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const wrapperRef = useRef<HTMLDivElement>(null);

  // The last pathname the entrance animation ran for. Null until the first
  // route is painted, which is how the initial hard load is detected.
  //
  // This must NOT be a boolean "is first render" flag combined into the layout
  // effect's dependencies: such a flag flips on the first re-render, and the
  // first re-render is the navigation click itself. That made the effect fire
  // while still on the outgoing page, replaying its entrance animation and
  // producing a visible flash before the route even changed.
  const animatedPath = useRef<string | null>(null);

  // Tracked as the path being left, not a boolean, so that once the router has
  // moved on the incoming instance is never mistaken for the outgoing one.
  const [exitingFrom, setExitingFrom] = useState<string | null>(null);
  const pendingHref = useRef<string | null>(null);
  const fallbackTimer = useRef<number | undefined>(undefined);
  const isExiting = exitingFrom !== null && exitingFrom === pathname;

  // Note: `pendingHref` is deliberately NOT cleared here. If a click lands right
  // as the route swaps, clearing it would drop a navigation we already called
  // preventDefault() on, leaving the click dead.
  useEffect(() => {
    setExitingFrom(null);
  }, [pathname]);

  /* ---------------------------------------------------------------- */
  /* Click interception                                                */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    // Reduced motion navigates immediately — no exit delay to sit through.
    if (reduceMotion) return;

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      // Left button only, and never when a modifier is held: those are
      // open-in-new-tab / new-window gestures that must reach the browser.
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.noTransition !== undefined) return;

      const targetAttr = anchor.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return;

      const href = anchor.getAttribute("href");
      // Root-relative paths only. Excludes mailto:, tel:, #hash, absolute URLs,
      // and protocol-relative "//host" links.
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;

      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname) return;

      event.preventDefault();
      pendingHref.current = url.pathname + url.search + url.hash;
      // Backdrop goes on <main>, which does not move, so it stays put while the
      // wrapper slides off and covers the area the wrapper vacates.
      wrapperRef.current?.parentElement?.classList.add("is-transitioning");
      setExitingFrom(pathname);

      // Safety net. The push normally fires from the exit's onAnimationComplete,
      // but a click landing exactly on the route-swap boundary can leave
      // `isExiting` false — the animation never runs, the callback never fires,
      // and the navigation is lost even though preventDefault() already blocked
      // the browser's own. Having called preventDefault we owe the user a
      // navigation, so guarantee one.
      window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = window.setTimeout(() => {
        const href = pendingHref.current;
        if (href) {
          pendingHref.current = null;
          router.push(href);
        }
      }, EXIT_SECONDS * 1000 + 150);
    }

    // Capture phase on `window`, which fires before React's delegated listener
    // and therefore before next/link's own onClick. A bubble-phase listener is
    // too late: Link would have already called router.push, the route would
    // change instantly, and the exit animation would never run.
    // next/link checks `defaultPrevented` and bails, so preventDefault is
    // enough — no stopPropagation, which would kill unrelated click handlers.
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [pathname, reduceMotion]);

  const handleExitComplete = useCallback(() => {
    const href = pendingHref.current;
    if (href) {
      pendingHref.current = null;
      window.clearTimeout(fallbackTimer.current);
      router.push(href);
    }
  }, [router]);

  useEffect(() => () => window.clearTimeout(fallbackTimer.current), []);

  /* ---------------------------------------------------------------- */
  /* Section stagger                                                   */
  /* ---------------------------------------------------------------- */
  // Because every page component returns a fragment, its sections are direct
  // DOM children of this wrapper. Indexing them here rather than with CSS
  // nth-child lets non-rendered children (the JSON-LD <script> tags some pages
  // emit) be skipped, so the first *visible* section always leads the sequence.
  //
  // Runs in a layout effect and applies the class only after the delays are
  // set, so the animation starts with correct timing and before the first paint.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Depends only on the pathname actually changing, never on a flag that
    // flips during the click's re-render — see the note on `animatedPath`.
    const isInitialRoute = animatedPath.current === null;
    animatedPath.current = pathname;

    // The new route has committed, so the exit-phase backdrop on <main> has
    // done its job. Drop it here, before paint — the wrapper's own backdrop
    // takes over for the mount gap. Keeping it any longer left a dark panel
    // behind transparent sections that flipped to --paper a second later.
    const main = wrapper.parentElement;
    main?.classList.remove("is-transitioning");

    if (isInitialRoute || reduceMotion) return;

    let index = 0;
    for (const child of Array.from(wrapper.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.tagName === "SCRIPT" || child.tagName === "STYLE") continue;
      child.style.setProperty(
        "--swipe-delay",
        `${Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS}ms`
      );
      index += 1;
    }

    wrapper.classList.add("page-swipe");

    return () => {
      wrapper.classList.remove("page-swipe");
      main?.classList.remove("is-transitioning");
    };
  }, [pathname, reduceMotion]);

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        key={pathname}
        ref={wrapperRef}
        // `false` starts at the animate values, which keeps opacity:0 out of the
        // server-rendered HTML. Without it every page would ship invisible to
        // anything that does not run the animation — non-rendering crawlers,
        // OG/social scrapers, and any client where JS fails.
        initial={false}
        animate={
          isExiting ? { x: EXIT_X, opacity: EXIT_OPACITY } : { x: 0, opacity: 1 }
        }
        transition={
          isExiting
            ? { duration: EXIT_SECONDS, ease: "easeIn" }
            : { duration: 0 }
        }
        onAnimationComplete={isExiting ? handleExitComplete : undefined}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
