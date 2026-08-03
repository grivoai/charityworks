import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = buildMetadata("auctioneers");

export default function AuctioneersRoute() {
  const page = getPage("auctioneers");

  /**
   * Requests carry only the person's id; /api/contact resolves the name from
   * the roster itself. Same one form and one endpoint as every other enquiry —
   * see lib/lead-context.ts for why the label is never sent from here.
   */
  const requestHref = (id: string) =>
    `/contact?interest=${encodeURIComponent(id)}&from=%2Fauctioneers`;

  return (
    <>
      <BreadcrumbJsonLd title="Auctioneers" path={page.seo.path} />

      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow">{page.intro.eyebrow}</span>
          <h1>{page.heading}</h1>
          <p className="lede">{page.intro.lede}</p>
        </div>
      </header>

      {/* ---------- WHY THIS ROSTER ---------- */}
      <section className="pad" aria-labelledby="diff-heading">
        <div className="wrap">
          <div className="center">
            <p className="section-lede reveal">{page.positioning}</p>
            <span className="eyebrow reveal" style={{ marginTop: "34px" }}>
              {page.differentiators.header.eyebrow}
            </span>
            <h2 className="section-title reveal" id="diff-heading">
              {page.differentiators.header.title}
            </h2>
          </div>

          <div className="why-grid">
            {page.differentiators.items.map((item, index) => (
              <div
                key={item.id}
                className={`why-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
              >
                <div className="why-ico" aria-hidden="true">
                  {item.icon}
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>

          <p className="auc-offer reveal">
            <span className="big">{page.offer.headline}</span>
            <span>{page.offer.detail}</span>
          </p>
        </div>
      </section>

      {/* ---------- THE ROSTER ---------- */}
      <section
        className="pad"
        style={{ background: "var(--cream)" }}
        aria-labelledby="roster-heading"
      >
        <div className="wrap">
          <div className="center">
            <h2 className="section-title reveal" id="roster-heading">
              {page.rosterHeading}
            </h2>
          </div>

          <div className="auc-list">
            {page.auctioneers.map((auctioneer, index) => (
              <article
                key={auctioneer.id}
                className={`auc-profile reveal${index % 2 ? " d1" : ""}`}
              >
                <div className="auc-portrait">
                  {auctioneer.image ? (
                    <Image
                      src={auctioneer.image.src}
                      alt={auctioneer.image.alt}
                      fill
                      sizes="(max-width: 860px) 100vw, 280px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <span className="auc-avatar" aria-hidden="true">
                      {auctioneer.initials}
                    </span>
                  )}
                </div>

                <div className="auc-profile-body">
                  <h3 className="auc-name">{auctioneer.name}</h3>

                  <div className="auc-meta">
                    {auctioneer.territory && (
                      <span className="auc-badge">{auctioneer.territory}</span>
                    )}
                    {auctioneer.credential && (
                      <span className="auc-badge auc-badge-role">
                        {auctioneer.credential}
                      </span>
                    )}
                    {auctioneer.accolade && (
                      <span className="auc-badge auc-badge-award">
                        <span aria-hidden="true">★</span> {auctioneer.accolade}
                      </span>
                    )}
                  </div>

                  {auctioneer.tagline && (
                    <p className="auc-tagline">{auctioneer.tagline}</p>
                  )}

                  {auctioneer.bio.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}

                  {/* Named in the accessible label: a page of nine identical
                      "Request this auctioneer" links tells a screen reader user
                      nothing about which one they are on. */}
                  <Link
                    className="auc-request"
                    href={requestHref(auctioneer.id)}
                    aria-label={`Request ${auctioneer.name} for your event`}
                  >
                    Request this auctioneer
                    <span aria-hidden="true"> →</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PARTNERS ---------- */}
      <section className="pad" aria-labelledby="partners-heading">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal">Partner</span>
            <h2 className="section-title reveal" id="partners-heading">
              {page.partners.title}
            </h2>
            <p className="section-lede reveal">{page.partners.blurb}</p>
          </div>

          <div className="auc-list">
            {page.partners.items.map((partner) => (
              <article key={partner.id} className="auc-profile reveal">
                <div className="auc-portrait">
                  {partner.image && (
                    <Image
                      src={partner.image.src}
                      alt={partner.image.alt}
                      fill
                      sizes="(max-width: 860px) 100vw, 280px"
                      style={{ objectFit: "cover" }}
                    />
                  )}
                </div>
                <div className="auc-profile-body">
                  <h3 className="auc-name">{partner.name}</h3>
                  <div className="auc-meta">
                    <span className="auc-badge auc-badge-role">
                      {partner.role}
                    </span>
                  </div>
                  {partner.bio.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                  {partner.closer && (
                    <p className="auc-closer">{partner.closer}</p>
                  )}

                  {/* Not "request this auctioneer": the partner does event
                      planning and catering. The lead is typed `partner` too, so
                      the notification asks for what they actually do. */}
                  <Link
                    className="auc-request"
                    href={requestHref(partner.id)}
                    aria-label={`Ask about working with ${partner.name}`}
                  >
                    Ask about this partner
                    <span aria-hidden="true"> →</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="center" style={{ marginTop: "52px" }}>
            <Cta cta={page.cta} onDark={false} />
          </div>
        </div>
      </section>
    </>
  );
}
