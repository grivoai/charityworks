import Link from "next/link";
import { getSite } from "@/lib/content";

/** Server component, so it reads the content layer directly rather than taking props. */
export async function Footer() {
  const site = await getSite();
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
