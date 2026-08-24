import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { FaqAccordion } from "@/components/FaqAccordion";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/JsonLd";
import { editable } from "@/lib/editable";
import { isAllowedEmbed } from "@/lib/embeds";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata("faqs");
}

export default async function FaqsRoute() {
  const page = await getPage("faqs");

  return (
    <>
      <BreadcrumbJsonLd title="FAQs" path={page.seo.path} />
      <FaqJsonLd faqs={page.faqs} />

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

      <section className="pad" aria-labelledby="faq-heading">
        <div className="wrap">
          <div className="center">
            <h2
              className="section-title reveal"
              id="faq-heading"
              {...editable("intro.title")}
            >
              {page.intro.title}
            </h2>
          </div>
          <FaqAccordion faqs={page.faqs} path="faqs" />

          {/* Small, and last before the button rather than first on the page:
              this answers a question somebody has after reading the others, and
              it is not what the site is selling.

              The URL is checked again here. The schema refuses a bad one on
              save, but the schema is what runs when somebody uses the admin —
              this is what runs when the document arrives by any other route,
              and an iframe is not a field to be trusting about. A refused URL
              renders no player rather than a broken frame. */}
          {page.video && isAllowedEmbed(page.video.embedUrl) && (
            <section className="faq-video reveal" aria-labelledby="video-heading">
              <h2 id="video-heading" {...editable("video.heading")}>
                {page.video.heading}
              </h2>
              {page.video.lede && (
                <p className="faq-video-lede" {...editable("video.lede")}>
                  {page.video.lede}
                </p>
              )}
              <div className="faq-video-frame">
                {/* `title` is the frame's accessible name — without it a screen
                    reader announces "frame" and nothing else. `loading="lazy"`
                    because the player sits below a page of questions and should
                    not compete with them for the first paint. */}
                <iframe
                  src={page.video.embedUrl}
                  title={page.video.heading}
                  loading="lazy"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              </div>
              {page.video.caption && (
                <p className="faq-video-caption" {...editable("video.caption")}>
                  {page.video.caption}
                </p>
              )}
            </section>
          )}

          <div className="center section-cta" style={{ "--cta-gap": "56px" } as React.CSSProperties}>
            <Cta cta={page.cta} onDark={false} path="cta" />
          </div>
        </div>
      </section>
    </>
  );
}
