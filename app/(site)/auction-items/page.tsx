import type { Metadata } from "next";
import Link from "next/link";
import { getAuctionCategories, getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { BentoGrid } from "@/components/BentoGrid";
import { editable } from "@/lib/editable";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata("auction-items");
}

export default async function AuctionItemsRoute() {
  const [page, categories] = await Promise.all([
    getPage("auction-items"),
    getAuctionCategories(),
  ]);

  return (
    <>
      <BreadcrumbJsonLd title="Auction Items" path={page.seo.path} />

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

      <section className="pad" aria-labelledby="catalog-heading">
        <div className="wrap">
          <div className="center">
            <h2 className="section-title reveal" id="catalog-heading"
              {...editable("intro.title")}>
              {page.intro.title}
            </h2>
          </div>
          {/* Entry point to the planner, above the grid: nine categories is
              exactly the point at which "where do I even start" sets in. */}
          <div className="planner-promo reveal">
            <p>
              <strong>Not sure where to start?</strong>
              Answer five questions and we&rsquo;ll point you at the categories
              that suit your event.
            </p>
            <Link href="/auction-planner">
              Find what&rsquo;s best for your auction
              <span aria-hidden="true"> →</span>
            </Link>
          </div>

          <BentoGrid items={categories} />
          <p className="catalog-note reveal" {...editable("note")}>
            {page.note}
          </p>
          <div className="center section-cta" style={{ "--cta-gap": "40px" } as React.CSSProperties}>
            <Cta cta={page.cta} onDark={false} path="cta" />
          </div>
        </div>
      </section>
    </>
  );
}
