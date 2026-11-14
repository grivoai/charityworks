import type { Metadata } from "next";

import { TravelVoucherBody } from "@/components/hidden-pages/TravelVoucherBody";
import { getHiddenPage, getSite } from "@/lib/content";
import { siteUrl } from "@/lib/site-config";

/**
 * /travel_voucher — how the free vacation voucher program works, and its FAQ,
 * as a HIDDEN page.
 *
 * Like /guitar-prices: an old-site address handed to people already talking to
 * CharityWorks (it is printed on vouchers), so it has to work, but it is not
 * meant to be found. noindex below; not in the sitemap, nav, footer, /llms.txt
 * or the admin's nav-link picker (see HIDDEN_PAGES in reserved-paths.ts).
 * The address must not change.
 *
 * Edited in the admin (Page text → Hidden pages) and stored in the `pages`
 * row "travel-voucher". With no valid row it shows the wording in
 * src/content/voucher-program.ts. It is program terms: Lauri's wording.
 */

const PATH = "/travel_voucher";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getHiddenPage("travel-voucher")]);
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

export default async function TravelVoucherRoute() {
  return <TravelVoucherBody page={await getHiddenPage("travel-voucher")} />;
}
