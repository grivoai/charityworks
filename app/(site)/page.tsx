import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAuctionCategories, getPage, getSite } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta, SectionHeading } from "@/components/Section";
import { BentoGrid } from "@/components/BentoGrid";
import { DonorIncentive } from "@/components/DonorIncentive";
import { TestimonialMarquee } from "@/components/TestimonialMarquee";
import { ContactForm } from "@/components/ContactForm";
import { CountUp } from "@/components/CountUp";
import { Icon } from "@/components/Icon";
import { editable } from "@/lib/editable";
import { testimonials } from "@/content/collections/testimonials";

/**
 * Runs before the hero paints. On the first visit of a session (and only when
 * motion is welcome) it flags the document so the CSS intro animations play and
 * the stat numbers count up; it records the visit so a reload or a scroll back
 * up never replays it, and clears the flag shortly after so a client-side
 * navigation back to the home page shows the finished state instead. Kept inline
 * and synchronous so there is no flash of the final layout before it animates.
 */
const HOME_INTRO_SCRIPT = `try{if(!sessionStorage.getItem('cw:home-intro')&&!matchMedia('(prefers-reduced-motion:reduce)').matches){sessionStorage.setItem('cw:home-intro','1');var r=document.documentElement;r.dataset.homeIntro='play';setTimeout(function(){r.removeAttribute('data-home-intro')},3000)}}catch(e){}`;

/** Wraps each word of the headline so the intro can stagger them in. */
function heroWords(text: string, startIndex: number) {
  let index = startIndex;
  return text.split(/(\s+)/).map((token, i) => {
    if (/^\s+$/.test(token) || token === "") return token;
    const delay = index++;
    return (
      <span
        key={i}
        className="intro-word"
        style={{ animationDelay: `calc(0.12s + ${delay} * 0.05s)` }}
      >
        {token}
      </span>
    );
  });
}

export function generateMetadata(): Promise<Metadata> {
  return buildMetadata("home");
}

/** Tiles in the home page's catalog preview. The bento layout is built for four. */
const HOME_TEASER_COUNT = 4;

export default async function HomePage() {
  const page = await getPage("home");
  const { hero } = page;
  // The form definition lives with the contact page content; the home page
  // renders the same fields so there is one source of truth for both.
  const [{ form: contactForm }, site, categories] = await Promise.all([
    getPage("contact"),
    getSite(),
    getAuctionCategories(),
  ]);

  // A preview of the catalog rather than a stored copy of it, so a category
  // added in the admin shows up here without anyone remembering to.
  const teaserItems = categories.slice(0, HOME_TEASER_COUNT);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <header className="hero">
        {/* First-load intro trigger. Inline + before the content so the flag is
            set before first paint — see HOME_INTRO_SCRIPT. */}
        <script dangerouslySetInnerHTML={{ __html: HOME_INTRO_SCRIPT }} />
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="wrap">
          <div className="hero-content">
            <div className="hero-pill">
              <span className="dot" aria-hidden="true" />
              {/* A span so the pill's own text can be pointed at without
                  selecting the status dot beside it. The container is already
                  an inline-flex with a gap, where a bare text node is an
                  anonymous flex item, so wrapping it changes no layout. */}
              <span {...editable("hero.pill")}>{hero.pill}</span>
            </div>
            <h1>
              <span {...editable("hero.headingLead")}>
                {heroWords(hero.headingLead, 0)}
              </span>
              <br />
              <span className="accent" {...editable("hero.headingAccent")}>
                {heroWords(
                  hero.headingAccent,
                  hero.headingLead.trim().split(/\s+/).length
                )}
              </span>
            </h1>
            <p className="sub" {...editable("hero.sub")}>
              {hero.sub}
            </p>
            <div className="hero-btns">
              <Cta cta={hero.primaryCta} path="hero.primaryCta" />
              <Cta cta={hero.secondaryCta} path="hero.secondaryCta" />
            </div>
          </div>

          <div className="hero-visual">
            {/* Real inventory behind the stats — signed guitar + framed jersey —
                so the hero shows what the business sells, not just text on dark.
                Decorative: the hero's meaning is carried by its copy. */}
            <div className="hero-collage" aria-hidden="true">
              <div className="hc hc-a">
                <Image
                  src="/images/catalog/guitars/guitar_01_taylor-swift.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 980px) 0px, 300px"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="hc hc-b">
                <Image
                  src="/images/catalog/memorabilia/memorabilia_01_george-kittle-49ers-handsigned-framed-jersey.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 980px) 0px, 280px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </div>
            <div className="hero-stats">
            {hero.stats.map((stat, index) => (
              <div key={stat.id} className={`stat-card s${index + 1}`}>
                <div className="num" {...editable(`hero.stats.${index}.value`)}>
                  <CountUp value={stat.value} />
                </div>
                <div className="lbl" {...editable(`hero.stats.${index}.label`)}>
                  {stat.label}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </header>

      {/* ---------- WHY CHARITYWORKS ---------- */}
      <section className="pad" aria-labelledby="why-heading">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal" {...editable("why.header.eyebrow")}>
              {page.why.header.eyebrow}
            </span>
            <h2
              className="section-title reveal"
              id="why-heading"
              {...editable("why.header.title")}
            >
              {page.why.header.title}
            </h2>
            <p className="section-lede reveal" {...editable("why.header.lede")}>
              {page.why.header.lede}
            </p>
          </div>
          <div className="why-grid">
            {page.why.items.map((item, index) => {
              const entry = `why.items.${index}`;
              return (
                <div
                  key={item.id}
                  className={`why-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
                >
                  <div
                    className="why-ico"
                    aria-hidden="true"
                    {...editable(`${entry}.icon`)}
                  >
                    <Icon name={item.icon} />
                  </div>
                  <h3 {...editable(`${entry}.title`)}>{item.title}</h3>
                  <p {...editable(`${entry}.body`)}>{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- REAL PHOTOGRAPHY BAND ----------
          A full-bleed strip of actual inventory between the icon-led sections,
          so the page is not carried by icons and text alone. Decorative. */}
      <section className="photo-band reveal" aria-hidden="true">
        <div className="pb">
          <Image src="/images/catalog/guitars/guitar_10_taylor-swift.jpg" alt="" fill sizes="(max-width: 700px) 50vw, 25vw" style={{ objectFit: "cover" }} />
        </div>
        <div className="pb">
          <Image src="/images/catalog/memorabilia/memorabilia_07_buster-posey-handsigned-framed-jersey.jpg" alt="" fill sizes="(max-width: 700px) 50vw, 25vw" style={{ objectFit: "cover" }} />
        </div>
        <div className="pb">
          <Image src="/images/catalog/gold-albums/goldalbum_15_pink-floyd-the-wall.jpg" alt="" fill sizes="(max-width: 700px) 50vw, 25vw" style={{ objectFit: "cover" }} />
        </div>
        <div className="pb">
          <Image src="/images/catalog/trips/trip_20_food-and-beverages-included.jpg" alt="" fill sizes="(max-width: 700px) 50vw, 25vw" style={{ objectFit: "cover" }} />
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section
        className="pad"
        style={{ background: "var(--cream)" }}
        aria-labelledby="process-heading"
      >
        <div className="wrap center">
          <span className="eyebrow reveal" {...editable("process.header.eyebrow")}>
            {page.process.header.eyebrow}
          </span>
          <h2
            className="section-title reveal"
            id="process-heading"
            {...editable("process.header.title")}
          >
            {page.process.header.title}
          </h2>
          <p className="section-lede reveal" {...editable("process.header.lede")}>
            {page.process.header.lede}
          </p>
          <div className="steps">
            {page.process.steps.map((step, index) => {
              const entry = `process.steps.${index}`;
              return (
                <div key={step.id} className={`step reveal d${index + 1}`}>
                  <div
                    className="step-num"
                    aria-hidden="true"
                    {...editable(`${entry}.number`)}
                  >
                    {step.number}
                  </div>
                  <div className="ico" aria-hidden="true" {...editable(`${entry}.icon`)}>
                    <Icon name={step.icon} />
                  </div>
                  <h3 {...editable(`${entry}.title`)}>{step.title}</h3>
                  <p {...editable(`${entry}.body`)}>{step.body}</p>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "52px" }}>
            <Cta cta={page.process.cta} onDark={false} path="process.cta" />
          </div>
        </div>
      </section>

      {/* ---------- AUCTION ITEMS TEASER ---------- */}
      <section className="pad" aria-labelledby="items-heading">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow reveal" {...editable("itemsTeaser.header.eyebrow")}>
              {page.itemsTeaser.header.eyebrow}
            </span>
            <h2
              className="section-title reveal"
              id="items-heading"
              {...editable("itemsTeaser.header.title")}
            >
              {page.itemsTeaser.header.title}
            </h2>
            <p className="section-lede reveal" {...editable("itemsTeaser.header.lede")}>
              {page.itemsTeaser.header.lede}
            </p>
          </div>
          <BentoGrid items={teaserItems} variant="uniform" />
          <div className="center" style={{ marginTop: "46px" }}>
            <Cta cta={page.itemsTeaser.cta} onDark={false} path="itemsTeaser.cta" />
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
          <span
            className="eyebrow reveal"
            {...editable("testimonialsTeaser.header.eyebrow")}
          >
            {page.testimonialsTeaser.header.eyebrow}
          </span>
          <h2
            className="section-title reveal"
            id="testimonials-heading"
            {...editable("testimonialsTeaser.header.title")}
          >
            {page.testimonialsTeaser.header.title}
          </h2>
          <p
            className="section-lede reveal"
            {...editable("testimonialsTeaser.header.lede")}
          >
            {page.testimonialsTeaser.header.lede}
          </p>
        </div>
        <TestimonialMarquee testimonials={testimonials} />
        <div className="wrap center" style={{ marginTop: "40px" }}>
          <Cta cta={page.testimonialsTeaser.cta} path="testimonialsTeaser.cta" />
        </div>
      </section>

      {/* ---------- DONOR INCENTIVE ----------
          Secondary hook, deliberately placed after the testimonials. */}
      <DonorIncentive donor={page.donor} path="donor" />

      {/* ---------- CLOSING: THE REAL CONTACT FORM ----------
          The form itself rather than another button, so the home page carries
          a conversion point instead of handing off to /contact. Same component
          and same /api/contact endpoint; ids are namespaced so the two copies
          of the form can never collide. */}
      <section className="pad contact" aria-labelledby="closing-heading">
        <div className="wrap">
          <div>
            <span className="eyebrow reveal" {...editable("closing.header.eyebrow")}>
              {page.closing.header.eyebrow}
            </span>
            <h2
              className="section-title reveal"
              id="closing-heading"
              {...editable("closing.header.title")}
            >
              {page.closing.header.title}
            </h2>
            <p
              className="section-lede reveal"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              <span {...editable("closing.header.lede")}>
                {page.closing.header.lede}
              </span>
            </p>

            <div className="contact-info">
              {site.contact.channels.map((channel, index) => (
                <div key={channel.id} className={`ci-row reveal d${index + 1}`}>
                  <div className="ci-ico" aria-hidden="true">
                    <Icon name={channel.icon} />
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
          {/* The record prefix, because this form's wording lives on the
              CONTACT page. Clicking it in the preview offers that editor
              rather than hunting for a field this document does not have. */}
          <ContactForm
            form={contactForm}
            booking={site.booking}
            idPrefix="home"
            source="home"
            path="contact:form"
          />
        </div>
      </section>
    </>
  );
}
