import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RevealObserver } from "@/components/RevealObserver";
import { AnimatedLayout } from "@/components/AnimatedLayout";
import { OrganizationJsonLd } from "@/components/JsonLd";
import { noindex, siteUrl } from "@/lib/site-config";
import { getSite } from "@/lib/content";

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
    // Set once here rather than per route: no page-level metadata sets `robots`,
    // so this default applies to every route including the category pages.
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSite();

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
        {/* Without JS the reveal observer never runs, so force content visible. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <Nav logo={site.logo} links={site.nav} cta={site.navCta} />
        <main id="main">
          <AnimatedLayout>{children}</AnimatedLayout>
        </main>
        <Footer />
        <RevealObserver />
        <OrganizationJsonLd />
      </body>
    </html>
  );
}
