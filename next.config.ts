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
      /* No /client-list entry. It used to redirect to /testimonials as the
         nearest available substitute; there is now a real client list at that
         address, so the legacy URL resolves to its actual successor. A redirect
         here would win over the page and make it unreachable — and the slug
         guard in `reserved-paths.ts` checks static routes, not redirect
         sources, so nothing would have reported it. */
      { source: "/virtual-auction", destination: "/auction-info", permanent: true },
      // No equivalent on the new site — sent home rather than to a soft 404.
      { source: "/cbid", destination: "/", permanent: true },
      { source: "/travel-terms", destination: "/", permanent: true },
      { source: "/terms-conditions", destination: "/", permanent: true },
      { source: "/terms-and-conditions-voucher", destination: "/", permanent: true },
    ];
  },

  async headers() {
    /**
     * SECURITY HEADERS ARE UNCONDITIONAL. They used to sit behind
     * `if (!noindex) return []`, which meant the only header this site sent
     * existed *because* the pre-launch flag was on — and would have vanished at
     * the moment the site became public, which is the moment it starts
     * mattering. Turning off `noindex` is the last step of the launch
     * checklist, so the failure would have arrived with nobody looking.
     *
     * `frame-ancestors 'none'` is the one that is not merely hygiene: without
     * it /admin/login can be framed on an attacker's page and clickjacked.
     */
    const security = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      /**
       * frame-ancestors only, not a full CSP. A complete policy has to name
       * every embed host, the Calendly widget, the hCaptcha frames and Next's
       * own inline bootstrap, and getting one of those wrong breaks the page
       * silently for visitors rather than loudly in a build. This directive is
       * the half that closes a real attack and cannot break a first-party
       * page; the rest is worth doing deliberately rather than as a rider on
       * a security fix.
       */
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    ];

    const headers = [{ source: "/:path*", headers: security }];

    if (noindex) {
      /**
       * Belt and braces alongside the `robots` meta tag in app/layout.tsx.
       * A meta tag only exists in HTML, so it cannot cover sitemap.xml, the
       * optimized images, or any other non-HTML response. X-Robots-Tag applies
       * to every response regardless of content type.
       */
      headers.push({
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      });
    }

    return headers;
  },
};

export default nextConfig;
