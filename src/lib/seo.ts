import type { Metadata } from "next";
import type { PageSlug } from "@/content/types";
import { siteUrl } from "@/lib/site-config";
import { getPageSeo, getSite } from "./content";

/**
 * Builds the Metadata object for a route from its content-layer SEO block.
 * Every page gets a unique title, a unique description and a self-referencing
 * canonical URL.
 */
export async function buildMetadata(slug: PageSlug): Promise<Metadata> {
  const [seo, site] = await Promise.all([getPageSeo(slug), getSite()]);
  const url = `${siteUrl}${seo.path}`;

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: site.name,
      title: seo.title,
      description: seo.description,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  };
}
