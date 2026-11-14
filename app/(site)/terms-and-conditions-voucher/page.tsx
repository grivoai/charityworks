import type { Metadata } from "next";

import { VoucherTermsBody } from "@/components/hidden-pages/VoucherTermsBody";
import { getHiddenPage, getSite } from "@/lib/content";
import { siteUrl } from "@/lib/site-config";

/**
 * /terms-and-conditions-voucher — the FREE Vacation Voucher Program's terms,
 * as a HIDDEN page.
 *
 * Like /guitar-prices: an old-site address printed on vouchers, so it has to
 * work, but it is not meant to be found. noindex below; not in the sitemap,
 * nav, footer, /llms.txt or the admin's nav-link picker (see HIDDEN_PAGES in
 * reserved-paths.ts). The address must not change.
 *
 * Edited in the admin (Page text → Hidden pages) and stored in the `pages`
 * row "voucher-terms". With no valid row it shows the wording in
 * src/content/voucher-program.ts. It is program terms: Lauri's wording.
 */

const PATH = "/terms-and-conditions-voucher";

export async function generateMetadata(): Promise<Metadata> {
  const [site, page] = await Promise.all([getSite(), getHiddenPage("voucher-terms")]);
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

export default async function VoucherTermsRoute() {
  return <VoucherTermsBody page={await getHiddenPage("voucher-terms")} />;
}
