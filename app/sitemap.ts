import type { MetadataRoute } from "next";
import { getAllPages, getAuctionCategories } from "@/lib/content";
import { siteUrl } from "@/content/site";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const pages = getAllPages().map((page) => ({
    url: `${siteUrl}${page.seo.path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: priorities[page.seo.path] ?? 0.6,
  }));

  // Category pages carry the long-tail terms ("celebrity signed guitar
  // fundraiser"), so they rank just below the top-level commercial pages.
  const categories = getAuctionCategories().map((category) => ({
    url: `${siteUrl}${category.seo.path}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...pages, ...categories];
}
