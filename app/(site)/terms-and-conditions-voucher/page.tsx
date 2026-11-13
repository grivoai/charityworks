import type { Metadata } from "next";

import { voucherBooking, voucherTerms } from "@/content/voucher-program";
import { getSite } from "@/lib/content";
import { siteUrl } from "@/lib/site-config";

/**
 * /terms-and-conditions-voucher — the FREE Vacation Voucher Program's terms,
 * as a HIDDEN page.
 *
 * Like /guitar-prices: an old-site address printed on vouchers, so it has to
 * work, but it is not meant to be found. noindex below; not in the sitemap,
 * nav, footer, /llms.txt or the admin's nav-link picker (see HIDDEN_PAGES in
 * reserved-paths.ts).
 *
 * Until Nov 2026 this address was a permanent redirect to /faqs. That redirect
 * is gone from next.config.ts.
 *
 * The wording is in src/content/voucher-program.ts. It is program terms:
 * change it only with the client's sign-off.
 */

const PATH = "/terms-and-conditions-voucher";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const title = `${voucherTerms.seo.title} | ${site.name}`;
  return {
    title,
    description: voucherTerms.seo.description,
    alternates: { canonical: `${siteUrl}${PATH}` },
    // Always, not only while the site-wide pre-launch flag is on.
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title,
      description: voucherTerms.seo.description,
      url: `${siteUrl}${PATH}`,
      type: "website",
    },
  };
}

export default function VoucherTermsRoute() {
  const { heading, lede, terms, dining } = voucherTerms;

  return (
    <>
      <header className="page-hero center">
        <div className="wrap">
          <h1>{heading}</h1>
          <p className="lede">{lede}</p>
        </div>
      </header>

      <section className="pad gp-about" aria-label={lede}>
        <div className="wrap">
          <ul className="text-list vp-list vp-terms reveal">
            {terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pad gp-row gp-row-tint">
        <div className="wrap center">
          <div className="gp-text vp-dining reveal">
            <h2 className="section-title">{dining.heading}</h2>
            <div className="block-prose">
              {dining.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <p className="gp-book">
              <a
                className="btn btn-gold"
                href={voucherBooking.href}
                target="_blank"
                rel="noopener"
              >
                {voucherBooking.label}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
