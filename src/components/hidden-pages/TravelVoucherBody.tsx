import Link from "next/link";
import type { TravelVoucherPage } from "@/content/hidden-pages";
import { withBookingPage } from "@/lib/calendly";

/**
 * The body of /travel_voucher, from its document. Shared by the public route
 * and the admin's preview frame, like GuitarPricesBody.
 */
export function TravelVoucherBody({ page }: { page: TravelVoucherPage }) {
  const { heading, lede, steps, explanation, faqHeading, faqs, booking, eventLinkLabel, eventLinkHref } = page;

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
            {steps.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="pad gp-row gp-row-tint">
        <div className="wrap center">
          <div className="block-prose vp-prose reveal">
            {explanation.map((p, i) => (
              <p key={i}>{p}</p>
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
            {faqs.map((faq, index) => (
              <div key={faq.id || index} className="vp-faq-item reveal">
                <dt>{faq.question}</dt>
                <dd>
                  <div className="block-prose">
                    {(faq.answer ?? []).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {(faq.bullets ?? []).length > 0 && (
                    <ul className="text-list vp-list">
                      {faq.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="gp-book center">
            <a className="btn btn-gold" href={withBookingPage(booking.href, "travel-voucher")} target="_blank" rel="noopener">
              {booking.label}
            </a>
          </p>
          {/* Optional, drawn only when both halves are set. */}
          {eventLinkLabel && eventLinkHref && (
            <p className="vp-event-link center">
              <Link href={eventLinkHref}>{eventLinkLabel}</Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
