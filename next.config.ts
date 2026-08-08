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
