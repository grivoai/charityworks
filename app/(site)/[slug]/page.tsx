import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAuctionCategories, getPage, getSite } from "@/lib/content";
import { getCustomPage, getPublishedCustomPages } from "@/lib/custom-pages";
import { couldBeCustomPage } from "@/lib/reserved-paths";
import { PageBlocks } from "@/components/PageBlocks";
import { siteUrl, noindex } from "@/lib/site-config";

/**
 * Pages the client built, served from one dynamic route.
 *
 * This sits at the root of the (site) group, so it catches any single-segment
 * address the eight hand-written routes do not. That ordering is Next's, not
 * ours — static segments always win over a dynamic one — which is exactly why
 * `reserved-paths.ts` exists: a custom page slugged `faqs` could never be
 * reached, and would fail silently rather than loudly.
 *
 * `couldBeCustomPage` is checked before the database is touched. Without it,
 * every 404 on the site — every scanner probing /wp-admin, every mistyped link
 * — becomes a query, and a cache entry, on a table it could never match.
 */

/**
 * The pages known at build time. Anything created afterwards is rendered on
 * demand and then cached, which is what lets the client publish a page without
 * a redeploy — `dynamicParams` defaults to true and is left that way
 * deliberately.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const pages = await getPublishedCustomPages();
  return pages.map((page) => ({ slug: page.slug }));
}

async function load(slug: string) {
  if (!couldBeCustomPage(slug)) return null;
  return getCustomPage(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return {};

  /**
   * An unlisted page is noindex, nofollow — and NOT disallowed in robots.txt.
   *
   * That is not an oversight, and app/robots.ts already explains the reasoning
   * for the site as a whole: a crawler blocked by robots.txt never fetches the
   * page, so it never sees the noindex, and a URL discovered from an external
   * link can still be indexed as a bare result. Blocking is how a page stays
   * OUT of the crawler and IN the index.
   */
  const unlisted = page.visibility === "unlisted";

  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: { canonical: `${siteUrl}/${page.slug}` },
    robots:
      unlisted || noindex
        ? { index: false, follow: false, nocache: true }
        : undefined,
    openGraph: {
      title: page.seo.title,
      description: page.seo.description,
      url: `${siteUrl}/${page.slug}`,
      type: "website",
    },
  };
}

export default async function CustomPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) notFound();

  // Fetched once here rather than per block: a page with three enquiry forms
  // should not make three round trips for the same form definition.
  const [{ form }, site, categories] = await Promise.all([
    getPage("contact"),
    getSite(),
    getAuctionCategories(),
  ]);

  return (
    <>
      <header className="page-hero center">
        <div className="wrap">
          <h1>{page.title}</h1>
          {page.intro && <p className="lede">{page.intro}</p>}
        </div>
      </header>

      <PageBlocks
        blocks={page.blocks}
        form={form}
        booking={site.booking}
        categories={categories}
      />
    </>
  );
}
