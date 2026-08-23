import Link from "next/link";
import type { SiteContent } from "@/content/types";

/**
 * Takes the site record rather than reading it, as `Nav` beside it already did.
 *
 * It used to call `getSite()` itself, which made it an async server component
 * and therefore renderable in exactly one place. The site preview needs the
 * same footer driven by a DRAFT — the form's state, which exists only in the
 * browser — and no amount of caching makes a server read able to show that.
 *
 * Nothing here is server-only now: props in, markup out, so the same component
 * renders on the public site and inside the preview frame.
 */
export function Footer({ site }: { site: SiteContent }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <div className="footer-logo">
              {site.logo.lead}
              <span>{site.logo.accent}</span>
            </div>
            <p className="tag">{site.description}</p>
            <div className="footer-states">
              <span aria-hidden="true">🇺🇸</span> Servicing all 50 states
            </div>
          </div>

          <div className="footer-col">
            <h2>{site.footer.exploreHeading}</h2>
            <nav aria-label="Footer">
              {site.nav.map((link) => (
                <Link key={link.id} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="footer-col">
            <h2>{site.footer.contactHeading}</h2>
            <a href={site.contact.phoneHref}>{site.contact.phone}</a>
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            <a href={`mailto:${site.contact.secondaryEmail}`}>
              {site.contact.secondaryEmail}
            </a>
            <p>{site.contact.principals}</p>
            <p>{site.contact.offices}</p>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © {year} {site.name}. {site.footer.legal}
          </div>
          <div>{site.strapline}</div>
        </div>
      </div>
    </footer>
  );
}
