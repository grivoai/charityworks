"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/content/site";

/**
 * Fixed site navigation. Same markup and classes as the original single-page
 * nav; the anchor links are now real routes and the current route is marked
 * with aria-current for both users and crawlers.
 */
export function Nav() {
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
        {site.logo.lead}
        <span>{site.logo.accent}</span>
      </Link>

      <ul className={`nav-links${menuOpen ? " open" : ""}`} id="navLinks">
        {site.nav.map((link) => {
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

      <Link href={site.navCta.href} className="btn btn-gold nav-cta">
        {site.navCta.label}
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
