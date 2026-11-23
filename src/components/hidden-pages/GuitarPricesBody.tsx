import Image from "next/image";

import type {
  GuitarPricesPage,
  GuitarSection,
  PricedGuitar,
} from "@/content/hidden-pages";
import { Icon } from "@/components/Icon";
import { withBookingPage } from "@/lib/calendly";

/**
 * The body of /guitar-prices, from its document.
 *
 * Shared by the public route (a server component) and the admin's preview
 * frame (a client component fed the unsaved form), so the preview is the
 * page's own markup, not an imitation of it. Nothing here may be server-only.
 *
 * Layout: the guitars two to a row; under each row but the last, the next
 * text section; under the last row, any sections left over and then the
 * closing section. With today's ten guitars and four sections that is the
 * old page exactly.
 */

type Labels = Pick<GuitarPricesPage, "priceLabel" | "consignmentLabel">;

function GuitarCard({ guitar, labels }: { guitar: PricedGuitar; labels: Labels }) {
  return (
    <li className="cat-card gp-card reveal">
      <div className="cat-card-media">
        {/* A guitar just added in the editor has no picture yet. */}
        {guitar.image?.src && (
          <Image
            src={guitar.image.src}
            alt={guitar.image.alt ?? ""}
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
            style={{ objectFit: "contain" }}
          />
        )}
      </div>
      <div className="cat-card-body gp-card-body">
        <h3>
          <span className="gp-name">{guitar.name}</span>
          <span className="gp-kind">{guitar.kind}</span>
        </h3>
        <p className="gp-price">
          {labels.priceLabel} {guitar.price}
        </p>
        <p className="gp-terms">{labels.consignmentLabel}</p>
      </div>
    </li>
  );
}

function GuideButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="btn btn-green gp-guide"
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={`${label}: Hand-Signed Guitars - Fundraising Info (opens in a new tab)`}
    >
      <span className="inline-ico" aria-hidden="true">
        <Icon name="receipt" />
      </span>{" "}
      {label}
    </a>
  );
}

function Section({
  section,
  guideHref,
  guideButton,
}: {
  section: GuitarSection;
  guideHref: string | null;
  guideButton: string;
}) {
  const bullets = section.bullets ?? [];
  const highlights = section.highlights ?? [];
  return (
    <div className="gp-text reveal">
      {section.heading && <h2 className="section-title">{section.heading}</h2>}
      {section.paragraphs.length > 0 && (
        <div className="block-prose">
          {section.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="text-list gp-bullets">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {section.guideLine && guideHref && (
        <>
          <div className="block-prose">
            <p>{section.guideLine}</p>
          </div>
          <GuideButton href={guideHref} label={guideButton} />
        </>
      )}
      {(section.highlightLead || highlights.length > 0) && (
        <>
          {section.highlightLead && (
            <div className="block-prose">
              <p>{section.highlightLead}</p>
            </div>
          )}
          {highlights.length > 0 && (
            <ul className="gp-ways">
              {highlights.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** Two to a row, in order. An odd count leaves one card on the last row. */
function pairs<T>(list: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
  return rows;
}

export function GuitarPricesBody({
  page,
  guideHref,
}: {
  page: GuitarPricesPage;
  /** `/d/<slug>` when the guide PDF is uploaded, otherwise null and no guide lines. */
  guideHref: string | null;
}) {
  const rows = pairs(page.guitars);
  const last = rows.length - 1;
  const { closing, booking, guideButton } = page;

  return (
    <>
      <header className="page-hero center">
        <div className="wrap">
          <h1>{page.heading}</h1>
          <p className="lede">{page.lede}</p>
        </div>
      </header>

      <section className="pad gp-about" aria-label={page.heading}>
        <div className="wrap center">
          <div className="block-prose reveal">
            {page.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <p>
              {page.verify.lead}{" "}
              <a href={page.verify.href} target="_blank" rel="noopener noreferrer">
                {page.verify.href}
              </a>
            </p>
            {page.closingParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {rows.map((row, index) => (
        <section
          key={row[0].id || index}
          className={`pad gp-row${index % 2 === 0 ? " gp-row-tint" : ""}`}
        >
          <div className="wrap center">
            <ul className="cat-grid gp-grid">
              {row.map((guitar, i) => (
                <GuitarCard key={guitar.id || i} guitar={guitar} labels={page} />
              ))}
            </ul>

            {index === last ? (
              <>
                {page.sections.slice(index).map((section, i) => (
                  <Section
                    key={section.id || i}
                    section={section}
                    guideHref={guideHref}
                    guideButton={guideButton}
                  />
                ))}
                <div className="gp-text reveal">
                  {closing.heading && (
                    <h2 className="section-title">{closing.heading}</h2>
                  )}
                  {guideHref && (
                    <>
                      <div className="block-prose">
                        <p>
                          {closing.guideBefore}{" "}
                          <a href={guideHref} target="_blank" rel="noopener">
                            {closing.guideTitle}
                          </a>{" "}
                          {closing.guideAfter}
                        </p>
                      </div>
                      <GuideButton href={guideHref} label={guideButton} />
                    </>
                  )}
                  <p className="gp-book">
                    <a
                      className="btn btn-gold"
                      href={withBookingPage(booking.href, "guitar-prices")}
                      target="_blank"
                      rel="noopener"
                    >
                      {booking.label}
                    </a>
                  </p>
                </div>
              </>
            ) : (
              page.sections[index] && (
                <Section
                  section={page.sections[index]}
                  guideHref={guideHref}
                  guideButton={guideButton}
                />
              )
            )}
          </div>
        </section>
      ))}
    </>
  );
}
