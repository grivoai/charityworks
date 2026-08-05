import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { FaqAccordion } from "@/components/FaqAccordion";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/JsonLd";

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
          <span className="eyebrow">{page.intro.eyebrow}</span>
          <h1>{page.heading}</h1>
          <p className="lede">{page.intro.lede}</p>
        </div>
      </header>

      <section className="pad" aria-labelledby="faq-heading">
        <div className="wrap">
          <div className="center">
            <h2 className="section-title reveal" id="faq-heading">
              {page.intro.title}
            </h2>
          </div>
          <FaqAccordion faqs={page.faqs} />
          <div className="center" style={{ marginTop: "56px" }}>
            <Cta cta={page.cta} onDark={false} />
          </div>
        </div>
      </section>
    </>
  );
}
