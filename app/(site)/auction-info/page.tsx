import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata("auction-info");
}

export default async function AuctionInfoRoute() {
  const page = await getPage("auction-info");

  return (
    <>
      <BreadcrumbJsonLd title="Auction Info" path={page.seo.path} />

      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow">{page.intro.eyebrow}</span>
          <h1>{page.heading}</h1>
          <p className="lede">{page.intro.lede}</p>
        </div>
      </header>

      {/* ---------- THE THREE STEPS ---------- */}
      <section className="pad" aria-labelledby="steps-heading">
        <div className="wrap center">
          <h2 className="section-title reveal" id="steps-heading">
            {page.intro.title}
          </h2>
          <div className="steps">
            {page.steps.map((step, index) => (
              <div key={step.id} className={`step reveal d${index + 1}`}>
                <div className="step-num" aria-hidden="true">
                  {step.number}
                </div>
                <div className="ico" aria-hidden="true">
                  {step.icon}
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PRICING MODEL ---------- */}
      <section
        className="pad"
        style={{ background: "var(--cream)" }}
        aria-labelledby="pricing-heading"
      >
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal">{page.pricing.header.eyebrow}</span>
            <h2 className="section-title reveal" id="pricing-heading">
              {page.pricing.header.title}
            </h2>
            <p className="section-lede reveal">{page.pricing.header.lede}</p>
          </div>
          <div className="why-grid">
            {page.pricing.points.map((point, index) => (
              <div
                key={point.id}
                className={`why-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
              >
                <div className="why-ico" aria-hidden="true">
                  {point.icon}
                </div>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- EVENT FORMATS ---------- */}
      <section className="pad" aria-labelledby="formats-heading">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal">{page.formats.header.eyebrow}</span>
            <h2 className="section-title reveal" id="formats-heading">
              {page.formats.header.title}
            </h2>
            <p className="section-lede reveal">{page.formats.header.lede}</p>
          </div>
          <div className="why-grid">
            {page.formats.items.map((format, index) => (
              <div
                key={format.id}
                className={`why-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
              >
                <div className="why-ico" aria-hidden="true">
                  {format.icon}
                </div>
                <h3>{format.title}</h3>
                <p>{format.body}</p>
              </div>
            ))}
          </div>
          <p className="info-note reveal">
            <span aria-hidden="true">📱</span>{" "}
            <strong>{page.mobileBidding.heading}</strong> —{" "}
            {page.mobileBidding.body}
          </p>
        </div>
      </section>

      {/* ---------- CLOSING CTA ---------- */}
      <section className="pad cta-band" aria-labelledby="auction-info-cta">
        <div className="wrap">
          <h2 className="section-title reveal" id="auction-info-cta">
            Ready to Supercharge Your Next Fundraiser?
          </h2>
          <p className="section-lede reveal">
            Tell us about your event and we&apos;ll build a risk-free plan to help
            you raise more than ever.
          </p>
          <Cta cta={page.cta} />
        </div>
      </section>
    </>
  );
}
