import type { NextConfig } from "next";

/**
 * Keep in step with `noindex` in src/content/site.ts. Read directly from the
 * environment because next.config runs outside the module graph that imports
 * site.ts.
 */
const noindex = process.env.SITE_NOINDEX === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
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
