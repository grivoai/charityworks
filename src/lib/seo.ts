import type { Metadata } from "next";
import type { PageSlug } from "@/content/types";
import { site, siteUrl } from "@/content/site";
import { getPageSeo } from "./content";

/**
 * Builds the Metadata object for a route from its content-layer SEO block.
 * Every page gets a unique title, a unique description and a self-referencing
 * canonical URL.
 */
export function buildMetadata(slug: PageSlug): Metadata {
  const seo = getPageSeo(slug);
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
