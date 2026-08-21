import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { FaqAccordion } from "@/components/FaqAccordion";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/JsonLd";
import { editable } from "@/lib/editable";

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
          <div className="center section-cta" style={{ "--cta-gap": "56px" } as React.CSSProperties}>
            <Cta cta={page.cta} onDark={false} path="cta" />
          </div>
        </div>
      </section>
    </>
  );
}
