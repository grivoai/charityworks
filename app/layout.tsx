import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RevealObserver } from "@/components/RevealObserver";
import { AnimatedLayout } from "@/components/AnimatedLayout";
import { OrganizationJsonLd } from "@/components/JsonLd";
import { site, siteUrl } from "@/content/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    // Each route supplies its own full title; this default covers the shell.
    default: `${site.name} — ${site.tagline}`,
    template: "%s",
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  robots: { index: true, follow: true },
};

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
        {/* Without JS the reveal observer never runs, so force content visible. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <Nav />
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
