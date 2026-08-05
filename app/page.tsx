import type { Metadata } from "next";
import Link from "next/link";
import { getPage, getSite } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta, SectionHeading } from "@/components/Section";
import { BentoGrid } from "@/components/BentoGrid";
import { DonorIncentive } from "@/components/DonorIncentive";
import { TestimonialMarquee } from "@/components/TestimonialMarquee";
import { ContactForm } from "@/components/ContactForm";
import { testimonials } from "@/content/collections/testimonials";

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata("home");
}

export default async function HomePage() {
  const page = await getPage("home");
  const { hero } = page;
  // The form definition lives with the contact page content; the home page
  // renders the same fields so there is one source of truth for both.
  const [{ form: contactForm }, site] = await Promise.all([
    getPage("contact"),
    getSite(),
  ]);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <header className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="wrap">
          <div className="hero-content">
            <div className="hero-pill">
              <span className="dot" aria-hidden="true" />
              {hero.pill}
            </div>
            <h1>
              {hero.headingLead}
              <br />
              <span className="accent">{hero.headingAccent}</span>
            </h1>
            <p className="sub">{hero.sub}</p>
            <div className="hero-btns">
              <Cta cta={hero.primaryCta} />
              <Cta cta={hero.secondaryCta} />
            </div>
          </div>

          <div className="hero-stats">
            {hero.stats.map((stat, index) => (
              <div key={stat.id} className={`stat-card s${index + 1}`}>
                <div className="num">{stat.value}</div>
                <div className="lbl">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- WHY CHARITYWORKS ---------- */}
      <section className="pad" aria-labelledby="why-heading">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal">{page.why.header.eyebrow}</span>
            <h2 className="section-title reveal" id="why-heading">
              {page.why.header.title}
            </h2>
            <p className="section-lede reveal">{page.why.header.lede}</p>
          </div>
          <div className="why-grid">
            {page.why.items.map((item, index) => (
              <div
                key={item.id}
                className={`why-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
              >
                <div className="why-ico" aria-hidden="true">
                  {item.icon}
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section
        className="pad"
        style={{ background: "var(--cream)" }}
        aria-labelledby="process-heading"
      >
        <div className="wrap center">
          <span className="eyebrow reveal">{page.process.header.eyebrow}</span>
          <h2 className="section-title reveal" id="process-heading">
            {page.process.header.title}
          </h2>
          <p className="section-lede reveal">{page.process.header.lede}</p>
          <div className="steps">
            {page.process.steps.map((step, index) => (
              <div key={step.id} className={`step reveal d${index + 1}`}>
                <div className="step-num" aria-hidden="true">
                  {step.number}
                </div>
                <div className="ico" aria-hidden="true">
                  {step.icon}
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "52px" }}>
            <Cta cta={page.process.cta} onDark={false} />
          </div>
        </div>
      </section>

      {/* ---------- AUCTION ITEMS TEASER ---------- */}
      <section className="pad" aria-labelledby="items-heading">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal">
              {page.itemsTeaser.header.eyebrow}
            </span>
            <h2 className="section-title reveal" id="items-heading">
              {page.itemsTeaser.header.title}
            </h2>
            <p className="section-lede reveal">{page.itemsTeaser.header.lede}</p>
          </div>
          <BentoGrid items={page.itemsTeaser.items} variant="uniform" />
          <div className="center" style={{ marginTop: "46px" }}>
            <Cta cta={page.itemsTeaser.cta} onDark={false} />
            <p className="home-planner-link reveal">
              Or{" "}
              <Link href="/auction-planner">
                answer five questions and we&rsquo;ll suggest a starting point
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS TEASER ---------- */}
      <section
        className="pad testimonials"
        aria-labelledby="testimonials-heading"
      >
        <div className="wrap center">
          <span className="eyebrow reveal">
            {page.testimonialsTeaser.header.eyebrow}
          </span>
          <h2 className="section-title reveal" id="testimonials-heading">
            {page.testimonialsTeaser.header.title}
          </h2>
          <p className="section-lede reveal">
            {page.testimonialsTeaser.header.lede}
          </p>
        </div>
        <TestimonialMarquee testimonials={testimonials} />
        <div className="wrap center" style={{ marginTop: "40px" }}>
          <Cta cta={page.testimonialsTeaser.cta} />
        </div>
      </section>

      {/* ---------- DONOR INCENTIVE ----------
          Secondary hook, deliberately placed after the testimonials. */}
      <DonorIncentive donor={page.donor} />

      {/* ---------- CLOSING: THE REAL CONTACT FORM ----------
          The form itself rather than another button, so the home page carries
          a conversion point instead of handing off to /contact. Same component
          and same /api/contact endpoint; ids are namespaced so the two copies
          of the form can never collide. */}
      <section className="pad contact" aria-labelledby="closing-heading">
        <div className="wrap">
          <div>
            <span className="eyebrow reveal">{page.closing.header.eyebrow}</span>
            <h2 className="section-title reveal" id="closing-heading">
              {page.closing.header.title}
            </h2>
            <p
              className="section-lede reveal"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {page.closing.header.lede}
            </p>

            <div className="contact-info">
              {site.contact.channels.map((channel, index) => (
                <div key={channel.id} className={`ci-row reveal d${index + 1}`}>
                  <div className="ci-ico" aria-hidden="true">
                    {channel.icon}
                  </div>
                  <div>
                    <div className="lbl">{channel.label}</div>
                    {channel.href ? (
                      <a href={channel.href} className="val">
                        {channel.value}
                      </a>
                    ) : (
                      <div className="val">{channel.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="home-contact-alt reveal d3">
              Prefer the full page?{" "}
              <Link href="/contact">Go to our contact page →</Link>
            </p>
          </div>

          {/* No `interests` map: this form cannot carry a specific lot or
              auctioneer, so the lookup stays out of the home page bundle. */}
          <ContactForm
            form={contactForm}
            booking={site.booking}
            idPrefix="home"
            source="home"
          />
        </div>
      </section>
    </>
  );
}
