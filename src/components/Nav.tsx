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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`} id="nav">
      <Link href="/" className="nav-logo">
        {logo.lead}
        <span>{logo.accent}</span>
      </Link>

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
      </ul>

      <Link href={cta.href} className="btn btn-gold nav-cta">
        {cta.label}
      </Link>

      <button
        className="nav-toggle"
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
