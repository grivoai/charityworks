import type { NextConfig } from "next";

/**
 * Keep in step with `noindex` in src/content/site.ts. Read directly from the
 * environment because next.config runs outside the module graph that imports
 * site.ts.
 */
const noindex = process.env.SITE_NOINDEX === "true";

/** The Supabase project's hostname, if one is configured. */
const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    /**
     * next/image refuses any host not listed here, so a photograph the client
     * uploads would render as a broken image until this knows about it. Derived
     * from the configured Supabase URL rather than written out, so a different
     * project — a staging one, or a restore — needs no code change and cannot
     * end up with the wrong host allowed.
     */
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },

  /**
   * Legacy Homestead URLs → their new homes, plus apex → www.
   *
   * `permanent: true` emits a 308 (a permanent redirect Google treats the same
   * as a 301, preserving the request method). These fire once charityworks.net
   * points at this deployment; until then the paths simply are not requested, so
   * carrying them now is harmless. Only paths that actually CHANGED are listed —
   * /auction-info, /faqs, /testimonials, /auctioneers, /auction-items, /contact
   * and / are already served here unchanged and need no hop.
   */
  async redirects() {
    return [
      // Canonical host: apex → www (the new site's canonical everywhere).
      {
        source: "/:path*",
        has: [{ type: "host", value: "charityworks.net" }],
        destination: "https://www.charityworks.net/:path*",
        permanent: true,
      },
      // Catalog category pages that moved under /auction-items.
      { source: "/gold-albums", destination: "/auction-items/gold-albums", permanent: true },
      { source: "/guitars-handsigned", destination: "/auction-items/signed-guitars", permanent: true },
      { source: "/guitar-prices", destination: "/auction-items/signed-guitars", permanent: true },
      { source: "/dm-taylor-swift", destination: "/auction-items/taylor-swift-signed-guitar", permanent: true },
      { source: "/mexicovac", destination: "/auction-items/vacations", permanent: true },
      { source: "/travel_voucher", destination: "/auction-items/vacations", permanent: true },
      { source: "/trips", destination: "/auction-items/vacations", permanent: true },
      { source: "/best-items", destination: "/auction-items", permanent: true },
      /* Categories that became groups of /auction-items/vacations. Their lots
         all still exist at the same ids under the same names — only the page
         they sit on changed — so these are ordinary moved-page redirects, not
         the "no equivalent" case below. Both were live pages with their own
         search listings and their own request links, so the hop stays. */
      { source: "/auction-items/bucket-list-trips", destination: "/auction-items/vacations", permanent: true },
      { source: "/auction-items/meet-and-greets", destination: "/auction-items/vacations", permanent: true },
      // Enquiry / roster / results equivalents.
      // Was sent home while there was nowhere for it to go; there is now.
      { source: "/newsletter-pdfs", destination: "/newsletters", permanent: true },
      { source: "/inquire-page", destination: "/contact", permanent: true },
      { source: "/client-list", destination: "/testimonials", permanent: true },
      { source: "/virtual-auction", destination: "/auction-info", permanent: true },
      // No equivalent on the new site — sent home rather than to a soft 404.
      { source: "/cbid", destination: "/", permanent: true },
      { source: "/travel-terms", destination: "/", permanent: true },
      { source: "/terms-conditions", destination: "/", permanent: true },
      { source: "/terms-and-conditions-voucher", destination: "/", permanent: true },
    ];
  },

  async headers() {
    if (!noindex) return [];

    /**
     * Belt and braces alongside the `robots` meta tag in app/layout.tsx.
     * A meta tag only exists in HTML, so it cannot cover sitemap.xml, the
     * optimized images, or any other non-HTML response. X-Robots-Tag applies
     * to every response regardless of content type.
     */
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
