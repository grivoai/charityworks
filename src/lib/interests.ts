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
  type: Extract<InterestType, "category" | "item" | "auctioneer">;
  /** Display name, authoritative. */
  label: string;
  /** For lots: the category they belong to, used in the summary line. */
  categoryLabel?: string;
  /** For lots and categories: where to link back to. */
  path?: string;
}

let cached: Map<string, InterestRecord> | null = null;

function buildRegistry(): Map<string, InterestRecord> {
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

  for (const category of getAuctionCategories()) {
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

  const { auctioneers, partners } = getPage("auctioneers");
  for (const person of [...auctioneers, ...partners.items]) {
    add({
      id: person.id,
      type: "auctioneer",
      label: person.name,
      path: "/auctioneers",
    });
  }

  return registry;
}

/** The registry, built once per process. */
export function getInterestRegistry(): Map<string, InterestRecord> {
  cached ??= buildRegistry();
  return cached;
}

/** Resolve an id, or undefined when it names nothing in the catalog. */
export function resolveInterest(id: unknown): InterestRecord | undefined {
  if (typeof id !== "string" || id === "") return undefined;
  return getInterestRegistry().get(id);
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

export function getInterestLookup(): InterestLookup {
  const lookup: InterestLookup = {};
  for (const [id, record] of getInterestRegistry()) {
    lookup[id] = {
      label: record.label,
      type: record.type,
      ...(record.categoryLabel ? { categoryLabel: record.categoryLabel } : {}),
    };
  }
  return lookup;
}
