import type { AuctionItem, Auctioneer, FaqItem } from "@/content/types";
import { siteUrl } from "@/lib/site-config";
import { getSite } from "@/lib/content";

/** Serializes structured data, escaping `<` so the payload cannot break out of the script tag. */
function LdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * "Ira & Lauri Klein" -> two people, both surnamed Klein.
 *
 * Splitting on the ampersand alone produces a founder called "Ira", because the
 * shared surname is written once and carried by the last name in the list. That
 * is an ordinary English idiom and a schema consumer reading "Ira" as a full
 * legal name is worse than emitting nothing.
 *
 * The rule is narrow on purpose: a segment that is a single word borrows the
 * final word of the last segment. "Ira & Lauri Klein" expands; "Ira Klein &
 * Jane Doe" is left alone, because both segments already carry a surname.
 */
function foundersFrom(principals: string): Array<{ "@type": "Person"; name: string }> {
  const parts = principals
    .split(/\s*&\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];

  const last = parts[parts.length - 1];
  const surname = last.split(/\s+/).pop() ?? "";

  return parts.map((part) => ({
    "@type": "Person" as const,
    name: part.includes(" ") || !surname ? part : `${part} ${surname}`,
  }));
}

/** Organization + LocalBusiness data. Rendered once, in the root layout. */
export async function OrganizationJsonLd() {
  const site = await getSite();
  return (
    <LdScript
      data={{
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": `${siteUrl}/#organization`,
        name: site.name,
        description: site.description,
        url: siteUrl,
        /* E.164, not the display form. The visible "(925) 250-6968" stays in
           `site.contact.phone` for the page; a consumer of this node wants the
           dialable one, so it is derived from the tel: href rather than stored
           twice and allowed to disagree. */
        telephone: `+1${site.contact.phoneHref.replace(/\D/g, "")}`,
        email: site.contact.email,
        /* The two people who are the entity. Both audits landed on the same
           finding from opposite directions: nine contracted auctioneers carry
           full Person markup with checkable credentials, while the principals
           of the business appear nowhere but the footer — and an unqualified
           search for the brand returns a different organisation entirely.
           `founder` is the cheapest signal that binds this node to them.

           Split from the stored `principals` string rather than written here,
           because names are content. */
        founder: foundersFrom(site.contact.principals),
        slogan: site.strapline,
        areaServed: {
          "@type": "Country",
          name: "United States",
        },
        knowsAbout: [
          "charity auction items",
          "consignment auction items for nonprofits",
          "celebrity signed guitar fundraiser",
          "gala auction ideas",
          "nonprofit fundraising consulting",
        ],
      }}
    />
  );
}

/** FAQPage data for the /faqs route. */
export function FaqJsonLd({ faqs }: { faqs: FaqItem[] }) {
  return (
    <LdScript
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }}
    />
  );
}

/**
 * Auction category structured data: a three-level breadcrumb plus an ItemList
 * of the category's contents.
 *
 * Still ItemList rather than Product/Offer. The lots are now real, but
 * Product/Offer markup asserts a price and availability to search engines, and
 * consignment stock has neither a fixed price nor guaranteed availability on
 * any given date. ItemList describes the page's contents without making a
 * claim the client cannot stand behind.
 */
export function CategoryJsonLd({ category }: { category: AuctionItem }) {
  const items = category.groups.flatMap((group) => group.items);
  return (
    <>
      <LdScript
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
            {
              "@type": "ListItem",
              position: 2,
              name: "Auction Items",
              item: `${siteUrl}/auction-items`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: category.title,
              item: `${siteUrl}${category.seo.path}`,
            },
          ],
        }}
      />
      <LdScript
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: category.heading,
          description: category.seo.description,
          numberOfItems: items.length,
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            description: item.description,
            ...(item.image ? { image: `${siteUrl}${item.image.src}` } : {}),
          })),
        }}
      />
    </>
  );
}

/**
 * The auctioneer roster as an ItemList of Person entities.
 *
 * Each named auctioneer becomes a thing a search engine can attribute — their
 * credential, territory, award and photograph — rather than a paragraph of body
 * text. `worksFor` links every one to the organization node the root layout
 * already defines (`#organization`), so the roster reads as this business's
 * people rather than nine unconnected names.
 *
 * Person, not ItemList of Offer: an auctioneer is a person the client books,
 * not a priced product — the same reason the catalog stays ItemList.
 */
export function AuctioneersJsonLd({
  auctioneers,
  name,
}: {
  auctioneers: Auctioneer[];
  name: string;
}) {
  return (
    <LdScript
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        numberOfItems: auctioneers.length,
        itemListElement: auctioneers.map((auctioneer, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Person",
            name: auctioneer.name,
            ...(auctioneer.credential ? { jobTitle: auctioneer.credential } : {}),
            ...(auctioneer.bio.length > 0
              ? { description: auctioneer.bio.join(" ") }
              : {}),
            ...(auctioneer.territory ? { areaServed: auctioneer.territory } : {}),
            ...(auctioneer.accolade ? { award: auctioneer.accolade } : {}),
            ...(auctioneer.image
              ? { image: `${siteUrl}${auctioneer.image.src}` }
              : {}),
            worksFor: { "@id": `${siteUrl}/#organization` },
          },
        })),
      }}
    />
  );
}

/** Breadcrumb trail for inner pages. */
export function BreadcrumbJsonLd({
  title,
  path,
}: {
  title: string;
  path: string;
}) {
  return (
    <LdScript
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: title,
            item: `${siteUrl}${path}`,
          },
        ],
      }}
    />
  );
}
