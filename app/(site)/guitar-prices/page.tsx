import type { Metadata } from "next";

import { GUITAR_GUIDE_DOCUMENT_SLUG } from "@/content/hidden-pages";
import { GuitarPricesBody } from "@/components/hidden-pages/GuitarPricesBody";
import { getDocumentSlugs } from "@/lib/documents";
import { getHiddenPage, getSite } from "@/lib/content";
import { siteUrl } from "@/lib/site-config";

/**
 * /guitar-prices — the guitar price list, as a HIDDEN page.
 *
 * It is the old site's address, handed out to people who are already talking
 * to CharityWorks, so it has to work when typed or clicked. It is not meant to
 * be found: it is noindex below, and it is in none of the places a page gets
 * listed — not the sitemap (built from the eight built-in pages and the LISTED
 * custom pages), not the nav or footer (both read Site details), not
 * /llms.txt (a fixed list), not the admin's nav-link picker (BUILT_IN_PAGES,
 * which this is deliberately not in — see HIDDEN_PAGES in reserved-paths.ts).
 *
 * The wording, prices and pictures are edited in the admin (Page text →
 * Hidden pages → Guitar prices) and stored in the `pages` row "guitar-prices".
 * With no valid row it shows the wording in src/content/guitar-prices.ts.
 */

const PATH = "/guitar-prices";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getHiddenPage("guitar-prices")]);
  const title = `${page.seo.title} | ${site.name}`;
  return {
    title,
    description: page.seo.description,
    alternates: { canonical: `${siteUrl}${PATH}` },
    // Always, not only while the site-wide pre-launch flag is on.
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title,
      description: page.seo.description,
      url: `${siteUrl}${PATH}`,
      type: "website",
    },
  };
}

export default async function GuitarPricesRoute() {
  /* Filtered against the documents that exist, as the catalog's brochure
     buttons are: no guide uploaded means no guide lines, rather than a
     button that opens a 404. Replacing the PDF in Documents replaces it here;
     saving a document refreshes DOCUMENTS_TAG, which getDocumentSlugs reads. */
  const [documents, page] = await Promise.all([
    getDocumentSlugs(),
    getHiddenPage("guitar-prices"),
  ]);
  const guideHref = documents.has(GUITAR_GUIDE_DOCUMENT_SLUG)
    ? `/d/${GUITAR_GUIDE_DOCUMENT_SLUG}`
    : null;

  return <GuitarPricesBody page={page} guideHref={guideHref} />;
}
