import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { TestimonialCard } from "@/components/TestimonialCard";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata("testimonials");
}

export default async function TestimonialsRoute() {
  const page = await getPage("testimonials");

  return (
    <>
      <BreadcrumbJsonLd title="Testimonials" path={page.seo.path} />

      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow">{page.intro.eyebrow}</span>
          <h1>{page.heading}</h1>
          <p className="lede">{page.intro.lede}</p>
        </div>
      </header>

      {/* A static grid rather than the home page marquee: each testimonial
          appears exactly once, so there is no duplicated content to index. */}
      <section className="pad" aria-labelledby="results-heading">
        <div className="wrap">
          <div className="center" style={{ marginBottom: "48px" }}>
            <h2 className="section-title reveal" id="results-heading">
              {page.intro.title}
            </h2>
          </div>
          <div className="t-grid">
            {page.testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
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
