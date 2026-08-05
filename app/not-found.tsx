import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { Cta } from "@/components/Section";

/**
 * The 404.
 *
 * An unmatched URL belongs to no route group, so Next renders this against the
 * root layout only — it cannot inherit `(site)/layout.tsx`. It therefore pulls
 * in `SiteChrome` itself, which is the whole reason that component exists.
 *
 * This replaces Next's built-in error page, which was what served 404s before
 * the route groups. That default injects its own `<style>` setting
 * `body { color:#000; background:#fff }` and a `height:100vh` centred block, so
 * on this site it rendered as a white full-viewport panel wedged between the
 * dark nav and footer, with the theme fighting it. Nothing was choosing that;
 * it was just what Next ships when no not-found page is supplied.
 */
export const metadata: Metadata = {
  title: "Page not found | CharityWorks",
  // A 404 has nothing worth indexing, whatever the deployment-wide setting is.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SiteChrome>
      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow">404</span>
          <h1>We couldn&rsquo;t find that page</h1>
          <p className="lede">
            The link may be out of date, or the page may have moved. The auction
            catalog and everything else are still a click away.
          </p>
        </div>
      </header>

      <section className="pad center">
        <div className="wrap">
          <Cta
            cta={{
              id: "cta-404",
              label: "Browse Auction Items",
              href: "/auction-items",
              variant: "primary",
            }}
            onDark={false}
          />
          <p className="cat-back" style={{ marginTop: "28px" }}>
            <Link href="/">← Back to the home page</Link>
            {" · "}
            <Link href="/contact">Get your free fundraising plan</Link>
          </p>
        </div>
      </section>
    </SiteChrome>
  );
}
