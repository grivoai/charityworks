import type { MetadataRoute } from "next";
import { noindex, siteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  if (noindex) {
    /**
     * Deliberately still allows crawling.
     *
     * The instinctive pre-launch config is `Disallow: /`, but that is
     * counter-productive here: a crawler blocked by robots.txt never fetches
     * the page, so it never sees the `noindex` tag, and a URL discovered from
     * an external link can still be indexed as a bare result. Google's own
     * guidance is not to block a page you want de-indexed.
     *
     * So: let crawlers in, let them read `noindex` on every page, and withhold
     * the sitemap so nothing is actively advertised for indexing.
     */
    return {
      rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] },
      host: siteUrl,
    };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
