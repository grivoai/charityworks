import type { Metadata } from "next";
import "./globals.css";
import { noindex, siteUrl } from "@/lib/site-config";
import { getSite } from "@/lib/content";

/**
 * The document shell, and nothing else.
 *
 * Only `<html>` and `<body>` have to live in the root layout, so only they do.
 * The public site's chrome — nav, footer, skip link, reveal observer — is in
 * `(site)/layout.tsx`, because nested layouts compose rather than replace: if
 * the nav were rendered here, `/admin` would inherit it and there would be no
 * way to opt out.
 *
 * The two route groups, `(site)` and `(admin)`, do not appear in any URL.
 * `app/(site)/contact/page.tsx` still serves `/contact`.
 */

/**
 * A function rather than a static object, because the brand name and tagline
 * are editable content now and have to be read rather than imported.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      // Each route supplies its own full title; this default covers the shell.
      default: `${site.name} — ${site.tagline}`,
      template: "%s",
    },
    description: site.description,
    applicationName: site.name,
    authors: [{ name: site.name }],
    // Set once here rather than per route: no public page sets `robots`, so
    // this default applies to every route including the category pages. The
    // admin layout overrides it with an unconditional noindex.
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Without JS the reveal observer never runs, so force content visible.
            Inert on admin pages, which carry no `.reveal` elements. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
