import type { Metadata } from "next";
import Link from "next/link";
import { getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta } from "@/components/Section";
import { BentoGrid } from "@/components/BentoGrid";
import { BreadcrumbJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = buildMetadata("auction-items");

export default function AuctionItemsRoute() {
  const page = getPage("auction-items");

  return (
    <>
      <BreadcrumbJsonLd title="Auction Items" path={page.seo.path} />

      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow">{page.intro.eyebrow}</span>
          <h1>{page.heading}</h1>
          <p className="lede">{page.intro.lede}</p>
        </div>
      </header>

      <section className="pad" aria-labelledby="catalog-heading">
        <div className="wrap">
          <div className="center">
            <h2 className="section-title reveal" id="catalog-heading">
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

          <BentoGrid items={page.items} />
          <p className="catalog-note reveal">{page.note}</p>
          <div className="center" style={{ marginTop: "40px" }}>
            <Cta cta={page.cta} onDark={false} />
          </div>
        </div>
      </section>
    </>
  );
}
