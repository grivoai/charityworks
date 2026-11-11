import type { PageSlug } from "@/content/types";
import { getAuctionCategories, getPageSeo, getSite } from "@/lib/content";
import { siteUrl } from "@/lib/site-config";

/**
 * /llms.txt — a plain-text map of the site for language-model crawlers
 * (https://llmstxt.org).
 *
 * BUILT FROM THE CONTENT, NOT WRITTEN INTO A FILE. The contact details and
 * every page description are read from the same records the pages render, so
 * an edit in the admin reaches this file at the next deploy and the two can
 * never disagree. A copy in /public would be a second version of the phone
 * number and the page blurbs that nobody would remember to update.
 *
 * The only wording fixed here is the summary paragraph, and every claim in it
 * is one the live site already makes (home, Auction Info, Auctioneers, Auction
 * Planner, FAQs). No prices, percentages or figures that change: those live on
 * the pages, where the client edits them.
 *
 * WHAT IS LEFT OUT, ON PURPOSE. Only the built-in pages and the catalog
 * categories are listed. Custom pages (campaign pages, the terms page) are not,
 * and neither is any legacy address: /travel_voucher and
 * /terms-and-conditions-voucher are permanent redirects in next.config.ts, not
 * pages, and nothing here should advertise them. /guitar-prices IS a page, but
 * a hidden one (noindex, see HIDDEN_PAGES in reserved-paths.ts), so it is left
 * out for the same reason.
 */

export const dynamic = "force-static";

/** The built-in pages worth listing, in reading order, with a link label each. */
const PAGES: Array<{ slug: PageSlug; label: string }> = [
  { slug: "home", label: "Home" },
  { slug: "auction-info", label: "Auction Info" },
  { slug: "auction-items", label: "Auction Items" },
  { slug: "auctioneers", label: "Auctioneers" },
  { slug: "auction-planner", label: "Auction Planner" },
  { slug: "faqs", label: "FAQs" },
  { slug: "testimonials", label: "Testimonials" },
  { slug: "contact", label: "Contact" },
];

/** One markdown list line; descriptions are single-line by construction. */
function entry(label: string, path: string, description: string): string {
  const url = path === "/" ? siteUrl : `${siteUrl}${path}`;
  return `- [${label}](${url}): ${description.replace(/\s+/g, " ").trim()}`;
}

export async function GET(): Promise<Response> {
  const [site, categories, pageSeo] = await Promise.all([
    getSite(),
    getAuctionCategories(),
    Promise.all(PAGES.map(({ slug }) => getPageSeo(slug))),
  ]);
  const { contact } = site;

  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `${site.name} supplies charity auction items to nonprofits for galas and fundraisers in all 50 states, on consignment: there is no upfront cost, the organization is invoiced after the event for sold items only, and anything that does not sell is returned. The catalog includes celebrity hand-signed guitars (the most requested item), sports and celebrity memorabilia, vacations and experiences, jewelry, handbags and framed gold albums. ${site.name} can also book a charity auctioneer from its roster, offers a free fundraising plan, and has an online Auction Planner that suggests item categories for an event. Run by ${contact.principals}; in business since 1990.`,
    "",
    "## Main pages",
    "",
    ...PAGES.map(({ label }, index) =>
      entry(label, pageSeo[index].path, pageSeo[index].description)
    ),
    "",
    "## Auction item categories",
    "",
    ...categories.map((category) =>
      entry(category.title, category.seo.path, category.seo.description)
    ),
    "",
    "## Contact",
    "",
    `- Phone: ${contact.phone}`,
    `- Email: ${contact.email}`,
    ...(contact.secondaryEmail ? [`- General email: ${contact.secondaryEmail}`] : []),
    `- Service area: ${contact.serviceArea}`,
    ...(contact.offices ? [`- Offices: ${contact.offices}`] : []),
    `- Enquiries: ${siteUrl}/contact`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
