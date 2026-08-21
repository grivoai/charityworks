"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { CtaRef, NavLink, SiteContent } from "@/content/types";

/**
 * Fixed site navigation. Same markup and classes as the original single-page
 * nav; the anchor links are now real routes and the current route is marked
 * with aria-current for both users and crawlers.
 *
 * Takes its content as props rather than importing it. This is a client
 * component — it needs `usePathname` and the scroll listener — and the content
 * layer is server-only now that it reads a database. The root layout reads the
 * site record and passes down the three pieces used here, rather than the
 * whole record: everything handed to a client component ships in the bundle.
 */
export function Nav({
  logo,
  links,
  cta,
}: {
  logo: SiteContent["logo"];
  links: NavLink[];
  cta: CtaRef;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /**
   * Hold the page still while the drawer is over it. Without this the body
   * scrolls under an open drawer — a swipe anywhere on the dimmed area moves
   * the page behind rather than doing nothing, so closing the menu drops you
   * somewhere other than where you opened it.
   *
   * Driven by a class rather than an inline style: `body` already carries
   * `overflow-x: hidden` from the stylesheet, and writing `style.overflow`
   * here would have to reinstate that exact value on cleanup or quietly widen
   * the page. Removing a class cannot get that wrong.
   */
  useEffect(() => {
    if (!menuOpen) return;
    // Both elements. The viewport takes its overflow from <html>, and only
    // falls back to <body> when <html> is `visible` — a propagation rule that
    // is easy to rely on by accident and that a future `overflow` on <html>
    // would silently break. Setting both removes the question.
    document.documentElement.classList.add("nav-open");
    document.body.classList.add("nav-open");
    return () => {
      document.documentElement.classList.remove("nav-open");
      document.body.classList.remove("nav-open");
    };
  }, [menuOpen]);

  // Escape closes the drawer, which is the one thing every other dismissible
  // layer on the web does and this one did not.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`} id="nav">
      <Link href="/" className="nav-logo">
        {logo.lead}
        <span>{logo.accent}</span>
      </Link>

      {/* Dimmed backdrop. Rendered always and revealed by CSS so it can
          transition with the drawer rather than appearing instantly, and
          aria-hidden because the button beside it already does the job for
          anyone not using a pointer. */}
      <div
        className={`nav-scrim${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <ul className={`nav-links${menuOpen ? " open" : ""}`} id="navLinks">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <li key={link.id}>
              <Link
                href={link.href}
                className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}

        {/* The drawer's own copy of the call to action. The header button is
            `display: none` below 760px, so before this the primary CTA was
            simply unreachable on a phone — the one button the site most wants
            tapped existed only on desktop. Hidden above 760px, where the
            header button is the one on screen. */}
        <li className="nav-links-cta">
          <Link href={cta.href} className="btn btn-gold">
            {cta.label}
          </Link>
        </li>
      </ul>

      <Link href={cta.href} className="btn btn-gold nav-cta">
        {cta.label}
      </Link>

      <button
        className={`nav-toggle${menuOpen ? " open" : ""}`}
        id="navToggle"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="navLinks"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  );
}
