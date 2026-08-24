import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuctionCategories, getAuctionCategory } from "@/lib/content";
import { getDocumentSlugs } from "@/lib/documents";
import {
  affordableTierNotice,
  availabilityNotice,
  generalCategoryNotice,
} from "@/content/collections/auction-items";
import { siteUrl } from "@/lib/site-config";
import { Cta } from "@/components/Section";
import { CategoryJsonLd } from "@/components/JsonLd";
import { Icon } from "@/components/Icon";
import { at, editable } from "@/lib/editable";

type Params = { slug: string };

/**
 * The affordable-tier mark.
 *
 * Carries its own visually-hidden label rather than relying on the legend
 * above: the legend is one sentence at the top of a page of 27 lots, and a
 * screen reader user arriving at a lot by heading navigation never passes it.
 * The star is the only thing on a card that is not also said in words.
 */
function Star({ path, decorative }: { path?: string; decorative?: boolean }) {
  return (
    <span
      className="cat-star"
      aria-hidden={decorative || undefined}
      {...(path ? editable(path) : {})}
    >
      <Icon name="star" />
      {!decorative && <span className="sr-only">Affordable tier. </span>}
    </span>
  );
}

/** Every category is known at build time, so all of them prerender as static. */
export async function generateStaticParams(): Promise<Params[]> {
  return (await getAuctionCategories()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getAuctionCategory(slug);
  if (!category) return {};

  const url = `${siteUrl}${category.seo.path}`;
  return {
    title: category.seo.title,
    description: category.seo.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: category.seo.title,
      description: category.seo.description,
      images: [{ url: category.image.src, alt: category.image.alt }],
    },
  };
}

export default async function AuctionCategoryRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const category = await getAuctionCategory(slug);
  if (!category) notFound();

  /**
   * Read once for the page rather than per lot, and used as a filter rather
   * than trusted: a lot naming a document that has been deleted or renamed
   * renders no button, instead of a button that opens a 404. Empty when there
   * is no database, which is the fallback build.
   */
  const documents = await getDocumentSlugs();

  /**
   * Requests go to the one contact form, carrying only the lot's id. The label
   * shown there — and the label put in front of the client — is resolved from
   * that id server-side, so nothing here can be edited in the URL into text
   * that reaches a notification. See lib/lead-context.ts.
   */
  const categoryPath = `/auction-items/${category.slug}`;
  const requestHref = (id: string) =>
    `/contact?interest=${encodeURIComponent(id)}&from=${encodeURIComponent(categoryPath)}`;

  return (
    <>
      <CategoryJsonLd category={category} />

      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow">
            <Link href="/auction-items">Auction Items</Link>
          </span>
          <h1>
            <span className="cat-hero-ico" aria-hidden="true" {...editable("icon")}>
              <Icon name={category.icon} />
            </span>{" "}
            <span {...editable("heading")}>{category.heading}</span>
          </h1>
          <p className="lede" {...editable("blurb")}>
            {category.blurb}
          </p>
        </div>
      </header>

      <section className="pad" aria-labelledby="category-heading">
        <div className="wrap">
          <div className="center">
            {/* No count. It used to read "14 lots in this category", which put a
                number on the page that shrinks every time a lot sells out —
                a smaller catalog is the last thing to advertise, and the
                figure told a visitor nothing they could not see by scrolling.
                Both kinds of category now use the same wording. */}
            <h2 className="section-title reveal" id="category-heading">
              What&rsquo;s in this category
            </h2>
            <p className="section-lede reveal" {...editable("intro")}>
              {category.intro}
            </p>
          </div>

          {category.groups.map((group, groupIndex) => {
            const at_ = (...rest: Array<string | number>) =>
              at("groups", groupIndex, ...rest);
            /**
             * Per group, not per page: on a page of 27 lots under three
             * headings, a key at the very top is off screen by the time anyone
             * reaches the stars it explains.
             *
             * Still conditional on the group actually having one. A section of
             * headline travel lots carries no stars and never will — the mark
             * means the affordable tier — and a key above it would be pointing
             * at a symbol that is not there. Written as a test of the lots
             * rather than a list of which groups get one, so starring a lot in
             * any group brings its key with it.
             */
            const groupHasAffordable = group.items.some(
              (item) => item.affordableTier
            );
            return (
            <div key={group.id} className="cat-group">
              {group.title && (
                <div className="cat-group-head reveal">
                  <h3 {...editable(at_("title"))}>{group.title}</h3>
                  {group.blurb && (
                    <p {...editable(at_("blurb"))}>{group.blurb}</p>
                  )}
                </div>
              )}

              {groupHasAffordable && (
                <p className="cat-legend reveal">
                  {/* Unmarked, unlike the stars on the cards. This one is the
                      key to the symbol rather than any lot's setting, and the
                      sentence beside it is a constant in the content module,
                      not a field. Decorative for the same reason: the sentence
                      it introduces already says what the star means, and a
                      hidden "Affordable tier." in front of it would be read
                      out twice over. */}
                  <Star decorative />
                  {affordableTierNotice}
                </p>
              )}

              <ul className="cat-grid">
                {group.items.map((item, index) => {
                  const lot = at_("items", index);
                  // Item names sit under the group's H3 when the group is
                  // titled, and directly under the section H2 when it is not —
                  // so their level follows, keeping the outline from skipping H3.
                  const NameTag = group.title ? "h4" : "h3";
                  return (
                  <li
                    key={item.id}
                    className={`cat-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
                  >
                    {item.image && (
                      <div
                        className="cat-card-media"
                        {...editable(at(lot, "image"))}
                      >
                        <Image
                          src={item.image.src}
                          alt={item.image.alt}
                          fill
                          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                    )}
                    <div className="cat-card-body">
                      <NameTag {...editable(at(lot, "name"))}>
                        {item.affordableTier && (
                          <Star path={at(lot, "affordableTier")} />
                        )}
                        {item.name}
                      </NameTag>
                      <p {...editable(at(lot, "description"))}>
                        {item.description}
                      </p>

                      {/* Rendered only when the client has supplied figures.
                          Nothing here is derived from the photograph or the
                          description — see ItemDetail in content/types.ts. */}
                      {item.details && item.details.length > 0 && (
                        <dl className="cat-card-details">
                          {item.details.map((detail, d) => (
                            <div key={detail.label}>
                              <dt {...editable(at(lot, "details", d, "label"))}>
                                {detail.label}
                              </dt>
                              <dd {...editable(at(lot, "details", d, "value"))}>
                                {detail.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {item.note && (
                        <p
                          className="cat-card-note"
                          {...editable(at(lot, "note"))}
                        >
                          {item.note}
                        </p>
                      )}

                      {/* aria-label rather than the visible text alone: a page
                          of identical "Request this item" links is useless to
                          anyone navigating by link list.

                          "Reserve this item for my event" is the heading on the
                          form these links lead to, and it stays there. Putting
                          it on 27 cards as well would say it three times on one
                          journey and make every card's action twice as long to
                          read. */}
                      <div className="cat-card-actions">
                        <Link
                          className="cat-card-request"
                          href={requestHref(item.id)}
                          aria-label={`${
                            category.generalOnly ? "Ask about" : "Request"
                          } ${item.name}`}
                        >
                          {category.generalOnly
                            ? "Ask about these"
                            : "Request this item"}
                          <span aria-hidden="true"> →</span>
                        </Link>

                        {/* The brochure the client already hands out, on the
                            permanent /d/ address rather than the storage URL —
                            so replacing the file in the admin repoints this
                            without touching the catalog. `target` because a
                            PDF replacing the page loses the reader's place in
                            a list of 27 lots. */}
                        {item.documentSlug &&
                          documents.has(item.documentSlug) && (
                            <a
                              className="cat-card-doc"
                              href={`/d/${item.documentSlug}`}
                              target="_blank"
                              rel="noopener"
                              aria-label={`Print or download the ${item.name} brochure (PDF, opens in a new tab)`}
                            >
                              <span className="inline-ico" aria-hidden="true">
                                <Icon name="receipt" />
                              </span>{" "}
                              Print / Download this PDF
                            </a>
                          )}
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </div>
            );
          })}

          <p className="cat-notice reveal">
            <strong>Availability:</strong>{" "}
            {category.generalOnly ? generalCategoryNotice : availabilityNotice}
          </p>

          <div className="center section-cta" style={{ "--cta-gap": "52px" } as React.CSSProperties}>
            {/* Carries the category itself as the interest, so someone who
                wants the category rather than one lot still arrives at the
                form with context attached.

                Worded around availability rather than the free-plan offer:
                this sits directly under the availability notice, at the end of
                a page of specific lots, and by that point the question in the
                reader's mind is whether these can be had for their date. The
                free-plan wording stays on the home, FAQ and testimonial
                surfaces, where the offer is the point. */}
            <Cta
              cta={{
                id: `cta-category-${category.slug}`,
                label: "Check Availability for Your Event",
                href: requestHref(category.id),
                variant: "primary",
              }}
              onDark={false}
            />
            <p className="cat-back">
              <Link href="/auction-items">← Back to all auction items</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
