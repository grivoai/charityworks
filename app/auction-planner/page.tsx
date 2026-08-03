import type { Metadata } from "next";
import { getAuctionCategories, getPage } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { AuctionPlanner } from "@/components/AuctionPlanner";
import type { PlannerCategoryCard } from "@/components/AuctionPlanner";
import {
  PLANNER_TIE_BREAK,
  plannerCategoryNotes,
} from "@/content/collections/planner-rules";

export const metadata: Metadata = buildMetadata("auction-planner");

export default function AuctionPlannerRoute() {
  const page = getPage("auction-planner");

  // Resolved here rather than in the client component so the catalog is not
  // shipped to the browser: only the eight scoring categories cross over, and
  // only the fields a result card renders.
  const byId = new Map(getAuctionCategories().map((c) => [c.id, c]));
  const categories: PlannerCategoryCard[] = PLANNER_TIE_BREAK.map((id) => {
    const category = byId.get(id);
    if (!category) {
      throw new Error(
        `Auction planner scores "${id}", which is not an auction category. ` +
          `Either the category was removed or its id changed — see ` +
          `PLANNER_CATEGORIES in content/collections/planner-rules.ts.`
      );
    }
    return {
      id: category.id,
      title: category.title,
      blurb: category.blurb,
      note: plannerCategoryNotes[category.id] ?? category.blurb,
      path: `/auction-items/${category.slug}`,
      image: { src: category.image.src, alt: category.image.alt },
    };
  });

  return (
    <>
      <BreadcrumbJsonLd title="Auction Planner" path={page.seo.path} />

      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow">{page.intro.eyebrow}</span>
          <h1>{page.heading}</h1>
          <p className="lede">{page.intro.lede}</p>
        </div>
      </header>

      <section className="pad" aria-label="Auction planner">
        <div className="wrap wrap-narrow">
          <AuctionPlanner page={page} categories={categories} />
        </div>
      </section>
    </>
  );
}
