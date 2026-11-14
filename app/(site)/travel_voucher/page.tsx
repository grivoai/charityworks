import type { Metadata } from "next";

import { travelVoucher, voucherBooking } from "@/content/voucher-program";
import { getSite } from "@/lib/content";
import { siteUrl } from "@/lib/site-config";

/**
 * /travel_voucher — how the free vacation voucher program works, and its FAQ,
 * as a HIDDEN page.
 *
 * Like /guitar-prices: an old-site address handed to people already talking to
 * CharityWorks (it is printed on vouchers), so it has to work, but it is not
 * meant to be found. noindex below; not in the sitemap, nav, footer, /llms.txt
 * or the admin's nav-link picker (see HIDDEN_PAGES in reserved-paths.ts).
 *
 * Until Nov 2026 this address was a permanent redirect to
 * /auction-items/vacations. That redirect is gone from next.config.ts.
 *
 * The wording is in src/content/voucher-program.ts. It is program terms:
 * change it only with the client's sign-off.
 */

const PATH = "/travel_voucher";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const title = `${travelVoucher.seo.title} | ${site.name}`;
  return {
    title,
    description: travelVoucher.seo.description,
    alternates: { canonical: `${siteUrl}${PATH}` },
    // Always, not only while the site-wide pre-launch flag is on.
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title,
      description: travelVoucher.seo.description,
      url: `${siteUrl}${PATH}`,
      type: "website",
    },
  };
}

export default function TravelVoucherRoute() {
  const { heading, lede, steps, why, faqHeading, faqs } = travelVoucher;

  return (
    <>
      <header className="page-hero center">
        <div className="wrap">
          <h1>{heading}</h1>
          <p className="lede">{lede}</p>
        </div>
      </header>

      <section className="pad gp-about" aria-label={heading}>
        <div className="wrap center">
          <div className="block-prose vp-prose reveal">
            {steps.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="pad gp-row gp-row-tint">
        <div className="wrap center">
          <div className="block-prose vp-prose reveal">
            {why.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="pad gp-row" aria-labelledby="vp-faq">
        <div className="wrap">
          <h2 id="vp-faq" className="section-title center">
            {faqHeading}
          </h2>
          <dl className="vp-faq">
            {faqs.map((faq) => (
              <div key={faq.question} className="vp-faq-item reveal">
                <dt>{faq.question}</dt>
                <dd>
                  <div className="block-prose">
                    {faq.answer.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                  {faq.bullets && (
                    <ul className="text-list vp-list">
                      {faq.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="gp-book center">
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
      </section>
    </>
  );
}
