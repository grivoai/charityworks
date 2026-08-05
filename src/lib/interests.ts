import { getAuctionCategories, getPage } from "@/lib/content";
import type { InterestType } from "@/lib/lead-context";

/**
 * The interest registry: every catalog record a lead can point at, keyed by the
 * same stable `id` the content layer already assigns.
 *
 * Two consumers, for the same reason:
 *
 *   - `/api/contact` resolves the submitted `interestId` here to derive the
 *     label it puts in the outgoing notification, so the browser never supplies
 *     display text (see the trust model in `lead-context.ts`).
 *   - `/contact` ships a trimmed copy to the client so the form can show
 *     "You're asking about …" without a round trip, and can likewise only
 *     display labels that resolve.
 *
 * Categories, lots and auctioneers already use distinct id prefixes
 * (`item-`, per-catalog names such as `guitar-`, and `auc-`), so one flat
 * namespace is unambiguous. A collision would be a content bug; `buildRegistry`
 * throws on one rather than letting a lead be silently mislabelled.
 */

export interface InterestRecord {
  id: string;
  type: Extract<InterestType, "category" | "item" | "auctioneer" | "partner">;
  /** Display name, authoritative. */
  label: string;
  /** For lots: the category they belong to, used in the summary line. */
  categoryLabel?: string;
  /** For lots and categories: where to link back to. */
  path?: string;
}

/**
 * Built on demand rather than memoised in a module variable.
 *
 * It used to be cached for the life of the process, which was free when the
 * catalog was a compiled-in constant. It is not free now: an admin adding a lot
 * revalidates the pages, but a module-level cache would survive that and keep
 * resolving against the catalog as it was when the instance started — so a
 * brand new lot's request link would come through as an untyped general
 * enquiry. Caching belongs at the content reads, where revalidation can reach
 * it, not here.
 */
async function buildRegistry(): Promise<Map<string, InterestRecord>> {
  const registry = new Map<string, InterestRecord>();

  const add = (record: InterestRecord) => {
    const existing = registry.get(record.id);
    if (existing) {
      throw new Error(
        `Duplicate interest id "${record.id}" ("${existing.label}" and "${record.label}"). ` +
          `Ids must be unique across categories, lots and auctioneers — a lead ` +
          `pointing at this id could not be labelled unambiguously.`
      );
    }
    registry.set(record.id, record);
  };

  for (const category of await getAuctionCategories()) {
    const path = `/auction-items/${category.slug}`;
    add({ id: category.id, type: "category", label: category.title, path });

    for (const group of category.groups) {
      for (const item of group.items) {
        add({
          id: item.id,
          type: "item",
          label: item.name,
          categoryLabel: category.title,
          path,
        });
      }
    }
  }

  // Auctioneers and partners share a page but not a trade: the featured partner
  // does event planning and catering. They are typed apart so the summary line
  // asks for the right thing.
  const { auctioneers, partners } = await getPage("auctioneers");
  for (const person of auctioneers) {
    add({
      id: person.id,
      type: "auctioneer",
      label: person.name,
      path: "/auctioneers",
    });
  }
  for (const partner of partners.items) {
    add({
      id: partner.id,
      type: "partner",
      label: partner.name,
      path: "/auctioneers",
    });
  }

  return registry;
}

/** The registry of everything a lead can point at. */
export function getInterestRegistry(): Promise<Map<string, InterestRecord>> {
  return buildRegistry();
}

/** Resolve an id, or undefined when it names nothing in the catalog. */
export async function resolveInterest(
  id: unknown
): Promise<InterestRecord | undefined> {
  if (typeof id !== "string" || id === "") return undefined;
  return (await getInterestRegistry()).get(id);
}

/**
 * The registry as a plain object, for handing to a client component.
 *
 * Around a hundred short records. Small enough to ship whole, and doing so is
 * what keeps `/contact` statically rendered: resolving the `?interest=` label
 * needs no request, so the page never has to read `searchParams` on the server.
 */
export type InterestLookup = Record<
  string,
  { label: string; type: InterestRecord["type"]; categoryLabel?: string }
>;

export async function getInterestLookup(): Promise<InterestLookup> {
  const lookup: InterestLookup = {};
  for (const [id, record] of await getInterestRegistry()) {
    lookup[id] = {
      label: record.label,
      type: record.type,
      ...(record.categoryLabel ? { categoryLabel: record.categoryLabel } : {}),
    };
  }
  return lookup;
}
