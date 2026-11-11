import type { Metadata } from "next";
import Image from "next/image";

import { guitarPrices, type GuitarSection, type PricedGuitar } from "@/content/guitar-prices";
import { getDocumentSlugs } from "@/lib/documents";
import { getSite } from "@/lib/content";
import { siteUrl } from "@/lib/site-config";
import { Icon } from "@/components/Icon";

/**
 * /guitar-prices — the guitar price list, as a HIDDEN page.
 *
 * It is the old site's address, handed out to people who are already talking
 * to CharityWorks, so it has to work when typed or clicked. It is not meant to
 * be found: it is noindex below, and it is in none of the places a page gets
 * listed — not the sitemap (built from the page documents and the LISTED
 * custom pages), not the nav or footer (both read Site details), not
 * /llms.txt (a fixed list), not the admin's nav-link picker (BUILT_IN_PAGES,
 * which this is deliberately not in — see HIDDEN_PAGES in reserved-paths.ts).
 *
 * Until Nov 2026 this address was a permanent redirect to the signed-guitars
 * category. That redirect is gone from next.config.ts; see the note there.
 *
 * The wording and prices are in src/content/guitar-prices.ts.
 */

const PATH = "/guitar-prices";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const title = `${guitarPrices.seo.title} | ${site.name}`;
  return {
    title,
    description: guitarPrices.seo.description,
    alternates: { canonical: `${siteUrl}${PATH}` },
    // Always, not only while the site-wide pre-launch flag is on.
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title,
      description: guitarPrices.seo.description,
      url: `${siteUrl}${PATH}`,
      type: "website",
    },
  };
}

function GuitarCard({ guitar }: { guitar: PricedGuitar }) {
  return (
    <li className="cat-card gp-card reveal">
      <div className="cat-card-media">
        <Image
          src={guitar.image.src}
          alt={guitar.image.alt}
          fill
          sizes="(max-width: 700px) 100vw, 50vw"
          style={{ objectFit: "contain" }}
        />
      </div>
      <div className="cat-card-body gp-card-body">
        <h3>
          <span className="gp-name">{guitar.name}</span>
          <span className="gp-kind">{guitar.kind}</span>
        </h3>
        <p className="gp-price">
          {guitarPrices.priceLabel} {guitar.price}
        </p>
        <p className="gp-terms">{guitarPrices.consignmentLabel}</p>
      </div>
    </li>
  );
}

function GuideButton({ href }: { href: string }) {
  return (
    <a
      className="btn btn-green gp-guide"
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={`${guitarPrices.guideButton}: Hand-Signed Guitars - Fundraising Info (opens in a new tab)`}
    >
      <span className="inline-ico" aria-hidden="true">
        <Icon name="receipt" />
      </span>{" "}
      {guitarPrices.guideButton}
    </a>
  );
}

function Section({
  section,
  guideHref,
}: {
  section: GuitarSection;
  guideHref: string | null;
}) {
  return (
    <div className="gp-text reveal">
      {section.heading && <h2 className="section-title">{section.heading}</h2>}
      {section.paragraphs.length > 0 && (
        <div className="block-prose">
          {section.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
      {section.bullets && (
        <ul className="text-list gp-bullets">
          {section.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {section.guide && guideHref && (
        <>
          <div className="block-prose">
            <p>{section.guide.lead}</p>
          </div>
          <GuideButton href={guideHref} />
        </>
      )}
      {section.ways && (
        <>
          <div className="block-prose">
            <p>{section.ways.lead}</p>
          </div>
          <ul className="gp-ways">
            {section.ways.items.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default async function GuitarPricesRoute() {
  /* Filtered against the documents that exist, as the catalog's brochure
     buttons are: no guide uploaded means no guide lines, rather than a
     button that opens a 404. */
  const documents = await getDocumentSlugs();
  const guideHref = documents.has(guitarPrices.guideDocumentSlug)
    ? `/d/${guitarPrices.guideDocumentSlug}`
    : null;

  const { about, rows, closingGuide, booking } = guitarPrices;
  const last = rows.length - 1;

  return (
    <>
      <header className="page-hero center">
        <div className="wrap">
          <h1>{about.heading}</h1>
          <p className="lede">{about.paragraphs[0]}</p>
        </div>
      </header>

      <section className="pad gp-about" aria-label={about.heading}>
        <div className="wrap center">
          <div className="block-prose reveal">
            {about.paragraphs.slice(1).map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p>
              {about.verify.lead}{" "}
              <a href={about.verify.href} target="_blank" rel="noopener noreferrer">
                {about.verify.href}
              </a>
            </p>
            {about.closing.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {rows.map((row, index) => (
        <section
          key={row.guitars[0].id}
          className={`pad gp-row${index % 2 === 0 ? " gp-row-tint" : ""}`}
        >
          <div className="wrap center">
            <ul className="cat-grid gp-grid">
              {row.guitars.map((guitar) => (
                <GuitarCard key={guitar.id} guitar={guitar} />
              ))}
            </ul>

            {index === last ? (
              <div className="gp-text reveal">
                {row.after.heading && (
                  <h2 className="section-title">{row.after.heading}</h2>
                )}
                {guideHref && (
                  <>
                    <div className="block-prose">
                      <p>
                        {closingGuide.before}{" "}
                        <a href={guideHref} target="_blank" rel="noopener">
                          {closingGuide.title}
                        </a>{" "}
                        {closingGuide.after}
                      </p>
                    </div>
                    <GuideButton href={guideHref} />
                  </>
                )}
                <p className="gp-book">
                  <a
                    className="btn btn-gold"
                    href={booking.href}
                    target="_blank"
                    rel="noopener"
                  >
                    {booking.label}
                  </a>
                </p>
              </div>
            ) : (
              <Section section={row.after} guideHref={guideHref} />
            )}
          </div>
        </section>
      ))}
    </>
  );
}
