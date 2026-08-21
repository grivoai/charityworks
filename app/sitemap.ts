import type { MetadataRoute } from "next";
import { getAllPages, getAuctionCategories } from "@/lib/content";
import { getListedCustomPages } from "@/lib/custom-pages";
import { siteUrl } from "@/lib/site-config";

/** Priority per route — the home page and the two commercial pages rank highest. */
const priorities: Record<string, number> = {
  "/": 1,
  "/auction-items": 0.9,
  "/contact": 0.9,
  "/auction-info": 0.8,
  "/auctioneers": 0.8,
  "/faqs": 0.7,
  "/testimonials": 0.7,
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  // Only the public site. /admin is never listed, and robots.txt disallows it.
  const pages = (await getAllPages()).map((page) => ({
    url: `${siteUrl}${page.seo.path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: priorities[page.seo.path] ?? 0.6,
  }));

  /**
   * Pages the client built — the LISTED ones only.
   *
   * `getListedCustomPages` is the single place `visibility` becomes a decision,
   * so an unlisted page cannot be absent from the menu and present in the
   * sitemap. Submitting an unlisted URL here would undo the point of it: the
   * sitemap is the most direct way there is of telling a crawler a page exists.
   *
   * Below the built-in pages by default. These are usually campaign or event
   * pages with a short life, and none of them should outrank /contact.
   */
  const custom = (await getListedCustomPages()).map((page) => ({
    url: `${siteUrl}/${page.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // Category pages carry the long-tail terms ("celebrity signed guitar
  // fundraiser"), so they rank just below the top-level commercial pages.
  const categories = (await getAuctionCategories()).map((category) => ({
    url: `${siteUrl}${category.seo.path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...pages, ...custom, ...categories];
}
