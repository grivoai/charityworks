import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuctionCategories, getAuctionCategory } from "@/lib/content";
import {
  availabilityNotice,
  generalCategoryNotice,
} from "@/content/collections/auction-items";
import { siteUrl } from "@/content/site";
import { Cta } from "@/components/Section";
import { CategoryJsonLd } from "@/components/JsonLd";

type Params = { slug: string };

/** Every category is known at build time, so all of them prerender as static. */
export function generateStaticParams(): Params[] {
  return getAuctionCategories().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getAuctionCategory(slug);
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
  const category = getAuctionCategory(slug);
  if (!category) notFound();

  const lotCount = category.groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <CategoryJsonLd category={category} />

      <header className="page-hero center">
        <div className="wrap">
          <span className="eyebrow">
            <Link href="/auction-items">Auction Items</Link>
          </span>
          <h1>
            <span aria-hidden="true">{category.icon}</span> {category.heading}
          </h1>
          <p className="lede">{category.blurb}</p>
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
            <p className="section-lede reveal">{category.intro}</p>
          </div>

          {category.groups.map((group) => (
            <div key={group.id} className="cat-group">
              {group.title && (
                <div className="cat-group-head reveal">
                  <h3>{group.title}</h3>
                  {group.blurb && <p>{group.blurb}</p>}
                </div>
              )}

              <ul className="cat-grid">
                {group.items.map((item, index) => (
                  <li
                    key={item.id}
                    className={`cat-card reveal${index % 3 > 0 ? ` d${index % 3}` : ""}`}
                  >
                    {item.image && (
                      <div className="cat-card-media">
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
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      {item.note && <p className="cat-card-note">{item.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="cat-notice reveal">
            <strong>Availability:</strong>{" "}
            {category.generalOnly ? generalCategoryNotice : availabilityNotice}
          </p>

          <div className="center" style={{ marginTop: "52px" }}>
            <Cta
              cta={{
                id: `cta-category-${category.slug}`,
                label: "Get Your Free Fundraising Plan",
                href: "/contact",
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
