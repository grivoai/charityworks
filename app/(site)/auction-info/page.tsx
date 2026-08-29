import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { Icon } from "@/components/Icon";
import { editable } from "@/lib/editable";
import { isAllowedEmbed } from "@/lib/embeds";
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
          <span className="eyebrow" {...editable("intro.eyebrow")}>
            {page.intro.eyebrow}
          </span>
          <h1 {...editable("heading")}>{page.heading}</h1>
          <p className="lede" {...editable("intro.lede")}>
            {page.intro.lede}
          </p>
        </div>
      </header>

      {/* ---------- THE THREE STEPS ---------- */}
      <section className="pad" aria-labelledby="steps-heading">
        <div className="wrap center">
          <h2 className="section-title reveal" id="steps-heading"
              {...editable("intro.title")}>
            {page.intro.title}
          </h2>
          <div className="steps">
            {page.steps.map((step, index) => {
              const entry = `steps.${index}`;
              return (
                <div key={step.id} className={`step reveal d${index + 1}`}>
                  <div className="step-num" aria-hidden="true" {...editable(`${entry}.number`)}>
                    {step.number}
                  </div>
                  <div className="ico" aria-hidden="true" {...editable(`${entry}.icon`)}>
                    <Icon name={step.icon} />
                  </div>
                  <h3 {...editable(`${entry}.title`)}>{step.title}</h3>
                  <p {...editable(`${entry}.body`)}>{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- DONATION MATCHING VIDEO ----------
          Second block on the page, straight after the three steps and before
          the money. Someone who has just read what the three steps are is at
          the point of asking "what does that look like in the room?", and two
          minutes of video answers that better than the next screen of text.

          Its own cream section rather than a block inside a neighbour: the
          sections either side are white and the tonal alternation is what
          separates them. */}
      {page.video && isAllowedEmbed(page.video.embedUrl) && (
        <section
          className="pad"
          style={{ background: "var(--cream)" }}
          aria-labelledby="video-heading"
        >
          <div className="wrap">
            {/* The URL is checked again here. The schema refuses a bad one on
                save, but the schema is what runs when somebody uses the admin —
                this is what runs when the document arrives by any other route,
                and an iframe is not a field to be trusting about. A refused URL
                renders no player rather than a broken frame. */}
            <div className="page-video reveal">
              <h2 id="video-heading" {...editable("video.heading")}>
                {page.video.heading}
              </h2>
              {page.video.lede && (
                <p className="page-video-lede" {...editable("video.lede")}>
                  {page.video.lede}
                </p>
              )}
              <div className="page-video-frame">
                {/* `title` is the frame's accessible name — without it a screen
                    reader announces "frame" and nothing else. `loading="lazy"`
                    because the player sits below a full page of explanation and
                    should not compete with it for the first paint. */}
                <iframe
                  src={page.video.embedUrl}
                  title={page.video.heading}
                  loading="lazy"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              </div>
              {page.video.caption && (
                <p className="page-video-caption" {...editable("video.caption")}>
                  {page.video.caption}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------- PRICING MODEL ---------- */}
      <section
        className="pad"
        style={{ background: "var(--cream)" }}
        aria-labelledby="pricing-heading"
      >
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal" {...editable("pricing.header.eyebrow")}>
              {page.pricing.header.eyebrow}
            </span>
            <h2
              className="section-title reveal"
              id="pricing-heading"
              {...editable("pricing.header.title")}
            >
              {page.pricing.header.title}
            </h2>
            <p className="section-lede reveal" {...editable("pricing.header.lede")}>
              {page.pricing.header.lede}
            </p>
          </div>
          <div className="why-grid">
            {page.pricing.points.map((point, index) => {
              const entry = `pricing.points.${index}`;
              return (
                <div
                  key={point.id}
                  className={`why-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
                >
                  <div className="why-ico" aria-hidden="true" {...editable(`${entry}.icon`)}>
                    <Icon name={point.icon} />
                  </div>
                  <h3 {...editable(`${entry}.title`)}>{point.title}</h3>
                  <p {...editable(`${entry}.body`)}>{point.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- EVENT FORMATS ---------- */}
      <section className="pad" aria-labelledby="formats-heading">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal" {...editable("formats.header.eyebrow")}>
              {page.formats.header.eyebrow}
            </span>
            <h2
              className="section-title reveal"
              id="formats-heading"
              {...editable("formats.header.title")}
            >
              {page.formats.header.title}
            </h2>
            <p className="section-lede reveal" {...editable("formats.header.lede")}>
              {page.formats.header.lede}
            </p>
          </div>
          <div className="why-grid">
            {page.formats.items.map((format, index) => {
              const entry = `formats.items.${index}`;
              return (
                <div
                  key={format.id}
                  className={`why-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
                >
                  <div className="why-ico" aria-hidden="true" {...editable(`${entry}.icon`)}>
                    <Icon name={format.icon} />
                  </div>
                  <h3 {...editable(`${entry}.title`)}>{format.title}</h3>
                  <p {...editable(`${entry}.body`)}>{format.body}</p>
                </div>
              );
            })}
          </div>
          <p className="info-note reveal">
            <span className="inline-ico" aria-hidden="true"><Icon name="smartphone" /></span>{" "}
            <strong {...editable("mobileBidding.heading")}>{page.mobileBidding.heading}</strong> —{" "}
            <span {...editable("mobileBidding.body")}>{page.mobileBidding.body}</span>
          </p>
        </div>
      </section>

      {/* ---------- CLOSING CTA ---------- */}
      <section className="pad cta-band" aria-labelledby="auction-info-cta">
        <div className="wrap">
          {/* Hard-coded, not page content — deliberately unmarked. */}
          <h2 className="section-title reveal" id="auction-info-cta">
            Ready to Supercharge Your Next Fundraiser?
          </h2>
          <p className="section-lede reveal">
            Tell us about your event and we&apos;ll build a risk-free plan to help
            you raise more than ever.
          </p>
          <Cta cta={page.cta} path="cta" />
        </div>
      </section>
    </>
  );
}
