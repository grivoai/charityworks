import type { Metadata } from "next";
import Link from "next/link";
import { getAuctionCategories, getPage, getSite } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Cta, SectionHeading } from "@/components/Section";
import { BentoGrid } from "@/components/BentoGrid";
import { DonorIncentive } from "@/components/DonorIncentive";
import { TestimonialMarquee } from "@/components/TestimonialMarquee";
import { ContactForm } from "@/components/ContactForm";
import { ContactChannels } from "@/components/ContactChannels";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { ItemMarquee } from "@/components/ItemMarquee";
import { Icon } from "@/components/Icon";
import { editable } from "@/lib/editable";
import { testimonials } from "@/content/collections/testimonials";

/**
 * Runs before the hero paints. On the first visit of a session (and only when
 * motion is welcome) it flags the document so the CSS intro animations play; it
 * records the visit so a reload or a scroll back
 * up never replays it, and clears the flag shortly after so a client-side
 * navigation back to the home page shows the finished state instead. Kept inline
 * and synchronous so there is no flash of the final layout before it animates.
 */
/**
 * How long the intro flag stays on the document.
 *
 * Every intro rule is gated on `[data-home-intro="play"]`, so this is a hard
 * deadline rather than a tidy-up: an animation still running when the attribute
 * is removed loses its rule mid-flight and snaps to its final state. The
 * sequence in globals.css ends at ~2.84s (hero tile 3: 1.94s delay + 0.9s), so
 * this carries ~1.6s of headroom. Raise it before lengthening anything there.
 */
const INTRO_CLEAR_MS = 4500;

const HOME_INTRO_SCRIPT = `try{if(!sessionStorage.getItem('cw:home-intro')&&!matchMedia('(prefers-reduced-motion:reduce)').matches){sessionStorage.setItem('cw:home-intro','1');var r=document.documentElement;r.dataset.homeIntro='play';setTimeout(function(){r.removeAttribute('data-home-intro')},${INTRO_CLEAR_MS})}}catch(e){}`;

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
        style={{ animationDelay: `calc(0.18s + ${delay} * 0.11s)` }}
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
        <HeroSlideshow />
        {/* Above the photographs, below the copy. Carries the contrast the
            headline used to get from the flat gradient. */}
        <div className="hero-scrim" />
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

            {/* ---- The free donor incentive, promoted out of the fold ----
                The offer that costs the nonprofit nothing was previously only
                discoverable by scrolling past four sections to reach #donor.
                It sits with the copy rather than in the tile stack on the
                right: the tiles are doors into the catalog, and filing the one
                free thing on the page among three things to buy is what made
                it read as a fourth category. Gold rather than glass for the
                same reason. */}
            {hero.offer && (
              <Link href={hero.offer.href} className="hero-offer">
                <span
                  className="hero-offer-ico"
                  aria-hidden="true"
                  {...editable("hero.offer.icon")}
                >
                  <Icon name={hero.offer.icon} />
                </span>
                <span className="hero-offer-text">
                  <span
                    className="hero-offer-name"
                    {...editable("hero.offer.label")}
                  >
                    {hero.offer.label}
                  </span>
                  <span
                    className="hero-offer-sub"
                    {...editable("hero.offer.sub")}
                  >
                    {hero.offer.sub}
                  </span>
                </span>
                {hero.offer.cue && (
                  <span
                    className="hero-offer-cue"
                    aria-hidden="true"
                    {...editable("hero.offer.cue")}
                  >
                    {hero.offer.cue}
                  </span>
                )}
              </Link>
            )}

            {/* The experience figure, demoted out of the card treatment beside
                it. It is the one number here that is about the company rather
                than about something the visitor can go and look at, so it sits
                with the copy as a credential rather than competing with three
                cards that lead somewhere. */}
            <p className="hero-badge">
              <span className="hero-badge-ico" aria-hidden="true">
                <Icon name="shield-check" />
              </span>
              <strong {...editable("hero.badge.value")}>
                {hero.badge.value}
              </strong>{" "}
              <span {...editable("hero.badge.label")}>{hero.badge.label}</span>
            </p>
          </div>

          {/* Doors, not statistics. These were four floating counters; the two
              categories the client sells most of and the auctioneer roster are
              worth more above the fold than a tally of them, and each card is
              now a single link with the whole tile as its hit area. */}
          <div className="hero-tiles">
            {hero.tiles.map((tile, index) => (
              <Link
                key={tile.id}
                href={tile.href}
                className={`hero-tile t${index + 1}`}
              >
                <span
                  className="hero-tile-ico"
                  aria-hidden="true"
                  {...editable(`hero.tiles.${index}.icon`)}
                >
                  <Icon name={tile.icon} />
                </span>
                <span
                  className="hero-tile-name"
                  {...editable(`hero.tiles.${index}.label`)}
                >
                  {tile.label}
                </span>
                <span
                  className="hero-tile-sub"
                  {...editable(`hero.tiles.${index}.sub`)}
                >
                  {tile.sub}
                </span>
                <span className="hero-tile-cue" aria-hidden="true">
                  Browse &rarr;
                </span>
              </Link>
            ))}
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
          <div className="section-cta" style={{ "--cta-gap": "52px" } as React.CSSProperties}>
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
        </div>

        {/* Full bleed, so it sits outside .wrap and runs the width of the
            viewport. Replaces the static four-photo band that used to sit
            between Why and How It Works: same job, and one photography strip
            on the page rather than two. */}
        <ItemMarquee categories={categories} />

        <div className="wrap">
          <BentoGrid items={teaserItems} variant="uniform" />
          <div className="center section-cta" style={{ "--cta-gap": "46px" } as React.CSSProperties}>
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
        <div className="wrap center section-cta" style={{ "--cta-gap": "40px" } as React.CSSProperties}>
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

            <ContactChannels channels={site.contact.channels} />

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
