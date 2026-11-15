import type { VoucherTermsPage } from "@/content/hidden-pages";

/**
 * The body of /terms-and-conditions-voucher, from its document. Shared by the
 * public route and the admin's preview frame, like GuitarPricesBody.
 */
export function VoucherTermsBody({ page }: { page: VoucherTermsPage }) {
  const { heading, lede, terms, dining, booking } = page;

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
            {terms.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pad gp-row gp-row-tint">
        <div className="wrap center">
          <div className="gp-text vp-dining reveal">
            <h2 className="section-title">{dining.heading}</h2>
            <div className="block-prose">
              {dining.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="gp-book">
              <a className="btn btn-gold" href={booking.href} target="_blank" rel="noopener">
                {booking.label}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
