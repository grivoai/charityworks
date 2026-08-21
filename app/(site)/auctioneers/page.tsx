import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { at, editable } from "@/lib/editable";
import { AuctioneersJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { Icon } from "@/components/Icon";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata("auctioneers");
}

export default async function AuctioneersRoute() {
  const page = await getPage("auctioneers");

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
      <AuctioneersJsonLd auctioneers={page.auctioneers} name={page.rosterHeading} />

      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow" {...editable("intro.eyebrow")}>
            {page.intro.eyebrow}
          </span>
          <h1 {...editable("heading")}>{page.heading}</h1>
          <p className="lede" {...editable("intro.lede")}>
            {page.intro.lede}
          </p>
        </div>
      </header>

      {/* ---------- WHY THIS ROSTER ---------- */}
      <section className="pad" aria-labelledby="diff-heading">
        <div className="wrap">
          <div className="center">
            <p className="section-lede reveal" {...editable("positioning")}>
              {page.positioning}
            </p>
            <span
              className="eyebrow reveal"
              style={{ marginTop: "34px" }}
              {...editable("differentiators.header.eyebrow")}
            >
              {page.differentiators.header.eyebrow}
            </span>
            <h2
              className="section-title reveal"
              id="diff-heading"
              {...editable("differentiators.header.title")}
            >
              {page.differentiators.header.title}
            </h2>
          </div>

          <div className="why-grid">
            {page.differentiators.items.map((item, index) => {
              const entry = `differentiators.items.${index}`;
              return (
                <div
                  key={item.id}
                  className={`why-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
                >
                  <div
                    className="why-ico"
                    aria-hidden="true"
                    {...editable(`${entry}.icon`)}
                  >
                    <Icon name={item.icon} />
                  </div>
                  <h3 {...editable(`${entry}.title`)}>{item.title}</h3>
                  <p {...editable(`${entry}.body`)}>{item.body}</p>
                </div>
              );
            })}
          </div>

          <p className="auc-offer reveal">
            <span className="big" {...editable("offer.headline")}>
              {page.offer.headline}
            </span>
            <span {...editable("offer.detail")}>{page.offer.detail}</span>
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
            <h2
              className="section-title reveal"
              id="roster-heading"
              {...editable("rosterHeading")}
            >
              {page.rosterHeading}
            </h2>
          </div>

          <div className="auc-list">
            {page.auctioneers.map((auctioneer, index) => {
              const who = `auctioneers.${index}`;
              return (
                <article
                  key={auctioneer.id}
                  className={`auc-profile reveal${index % 2 ? " d1" : ""}`}
                >
                <div className="auc-portrait" {...editable(at(who, "image"))}>
                  {auctioneer.image ? (
                    <Image
                      src={auctioneer.image.src}
                      alt={auctioneer.image.alt}
                      fill
                      sizes="(max-width: 860px) 100vw, 280px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      className="auc-avatar"
                      aria-hidden="true"
                      {...editable(at(who, "initials"))}
                    >
                      {auctioneer.initials}
                    </span>
                  )}
                </div>

                <div className="auc-profile-body">
                  <h3 className="auc-name" {...editable(at(who, "name"))}>
                    {auctioneer.name}
                  </h3>

                  <div className="auc-meta">
                    {auctioneer.territory && (
                      <span className="auc-badge" {...editable(at(who, "territory"))}>
                        {auctioneer.territory}
                      </span>
                    )}
                    {auctioneer.credential && (
                      <span
                        className="auc-badge auc-badge-role"
                        {...editable(at(who, "credential"))}
                      >
                        {auctioneer.credential}
                      </span>
                    )}
                    {auctioneer.accolade && (
                      <span className="auc-badge auc-badge-award">
                        <span aria-hidden="true">★</span>{" "}
                        <span {...editable(at(who, "accolade"))}>
                          {auctioneer.accolade}
                        </span>
                      </span>
                    )}
                  </div>

                  {auctioneer.tagline && (
                    <p className="auc-tagline" {...editable(at(who, "tagline"))}>
                      {auctioneer.tagline}
                    </p>
                  )}

                  {auctioneer.bio.map((para, i) => (
                    <p key={i} {...editable(at(who, "bio", i))}>
                      {para}
                    </p>
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
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- PARTNERS ---------- */}
      <section className="pad" aria-labelledby="partners-heading">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal">Partner</span>
            <h2
              className="section-title reveal"
              id="partners-heading"
              {...editable("partners.title")}
            >
              {page.partners.title}
            </h2>
            <p className="section-lede reveal" {...editable("partners.blurb")}>
              {page.partners.blurb}
            </p>
          </div>

          <div className="auc-list">
            {page.partners.items.map((partner, index) => {
              const who = `partners.items.${index}`;
              return (
                <article key={partner.id} className="auc-profile reveal">
                <div className="auc-portrait" {...editable(at(who, "image"))}>
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
                  <h3 className="auc-name" {...editable(at(who, "name"))}>
                    {partner.name}
                  </h3>
                  <div className="auc-meta">
                    <span
                      className="auc-badge auc-badge-role"
                      {...editable(at(who, "role"))}
                    >
                      {partner.role}
                    </span>
                  </div>
                  {partner.bio.map((para, i) => (
                    <p key={i} {...editable(at(who, "bio", i))}>
                      {para}
                    </p>
                  ))}
                  {partner.closer && (
                    <p className="auc-closer" {...editable(at(who, "closer"))}>
                      {partner.closer}
                    </p>
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
              );
            })}
          </div>

          <div className="center section-cta" style={{ "--cta-gap": "52px" } as React.CSSProperties}>
            <Cta cta={page.cta} onDark={false} path="cta" />
          </div>
        </div>
      </section>
    </>
  );
}
