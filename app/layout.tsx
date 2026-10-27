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

/**
 * Adds `reveal-js` to <html>, which is what hides `.reveal` content until it
 * scrolls in (globals.css). Plain ES5 on purpose: it has to run on browsers
 * too old for the rest of the site's JavaScript.
 *
 * Two checks, because hiding content is only safe if something will show it:
 *   - The bundle uses class static blocks (Safari 16.4+). A browser that cannot
 *     parse one cannot run the bundle, so RevealObserver never would — never
 *     hide. This is the iPhone 7 case: iOS 15 tops out at Safari 15.
 *   - Anything else that stops the bundle (a failed chunk, a different syntax
 *     gap): if RevealObserver has not marked <html> `reveal-live` within two
 *     seconds of load, drop `reveal-js` and show everything unanimated.
 */
const revealGate = `(function () {
  var d = document.documentElement;
  try { new Function("class A { static {} }"); } catch (e) { return; }
  d.classList.add("reveal-js");
  window.addEventListener("load", function () {
    setTimeout(function () {
      if (!d.classList.contains("reveal-live")) d.classList.remove("reveal-js");
    }, 2000);
  });
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: revealGate adds classes to <html> before React
    // hydrates it.
    <html lang="en" suppressHydrationWarning>
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
        {/* Lets `.reveal` content start hidden only where RevealObserver will
            actually reveal it — see revealGate. Without JS this never runs, so
            the content is simply visible. */}
        <script dangerouslySetInnerHTML={{ __html: revealGate }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
