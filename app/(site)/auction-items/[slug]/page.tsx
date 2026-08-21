import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuctionCategories, getAuctionCategory } from "@/lib/content";
import {
  availabilityNotice,
  generalCategoryNotice,
} from "@/content/collections/auction-items";
import { siteUrl } from "@/lib/site-config";
import { Cta } from "@/components/Section";
import { CategoryJsonLd } from "@/components/JsonLd";
import { Icon } from "@/components/Icon";
import { at, editable } from "@/lib/editable";

type Params = { slug: string };

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

  const lotCount = category.groups.reduce((n, g) => n + g.items.length, 0);

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
            <h2 className="section-title reveal" id="category-heading">
              {category.generalOnly
                ? "What's in this category"
                : `${lotCount} lot${lotCount === 1 ? "" : "s"} in this category`}
            </h2>
            <p className="section-lede reveal" {...editable("intro")}>
              {category.intro}
            </p>
          </div>

          {category.groups.map((group, groupIndex) => {
            const at_ = (...rest: Array<string | number>) =>
              at("groups", groupIndex, ...rest);
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
                      <NameTag {...editable(at(lot, "name"))}>{item.name}</NameTag>
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
                          anyone navigating by link list. */}
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
