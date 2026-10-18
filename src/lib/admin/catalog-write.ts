import type { AuctionItem } from "@/content/types";

/**
 * Turning an edited category back into rows.
 *
 * The pages editor writes one JSON document to one column. The catalog does not
 * work that way: a category is assembled from three tables, so a save has to be
 * taken apart again — and that is the only genuinely new risk in editing the
 * catalog, so it lives in its own module, as a pure function, with a script
 * that checks it.
 *
 * Two rules run through everything here.
 *
 * AN ITEM ID IS NEVER DESTROYED. `?interest=` carries these ids and
 * `resolveInterest()` looks them up, so a link in a circulating email or a
 * bookmarked page resolves through them long after the lot is gone. Deleting
 * the row turns that link into an untyped "general enquiry" — the enquiry still
 * arrives, but nobody can tell what it was about. So an item removed in the
 * form is ARCHIVED (`published = false`), which takes it off the site and keeps
 * the id resolvable.
 *
 * GROUPS ARE NOT ADDED OR REMOVED HERE. `catalog_groups` cascades on delete, so
 * removing a group would take its items' rows with it — the one operation that
 * defeats the rule above, and it would happen silently. The form locks the list
 * length; this asserts it as well, because a lock is a UI affordance and this is
 * the thing that actually writes.
 */

export interface CategoryRowPatch {
  slug: string;
  icon: string;
  title: string;
  blurb: string;
  heading: string;
  intro: string;
  image_src: string;
  image_alt: string;
  image_width: number | null;
  image_height: number | null;
  span: "wide" | "tall" | null;
  general_only: boolean;
  seo: unknown;
}

export interface GroupRowPatch {
  id: string;
  title: string | null;
  blurb: string | null;
  cover_image_src: string | null;
  cover_image_alt: string | null;
  cover_image_width: number | null;
  cover_image_height: number | null;
  position: number;
}

export interface ItemRowPatch {
  id: string;
  group_id: string;
  name: string;
  description: string;
  image_src: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
  note: string | null;
  details: unknown;
  affordable_tier: boolean;
  document_slug: string | null;
  position: number;
}

export interface CategoryWritePlan {
  category: CategoryRowPatch;
  groups: GroupRowPatch[];
  items: ItemRowPatch[];
  /** Item ids to take off the site while keeping the row. */
  archive: string[];
  /** Ids that do not yet exist, so the caller can report what it added. */
  created: string[];
}

export class CategoryWriteError extends Error {}

/**
 * The refusal when a new lot's id is already taken. Worded for the client:
 * ids are never shown, so the only thing they can do about it is make the lot
 * again, which mints a fresh one.
 */
export const REUSED_LOT_ID_MESSAGE =
  "A new lot was given an identifier that is already in use. Remove the new " +
  "lot and add or duplicate it again, then save.";

/** Which of `ids` exist as lot rows, in any category, published or not. */
export type LotRowLookup = (ids: string[]) => Promise<string[]>;

/**
 * The lots new in this save whose id already belongs to a lot row.
 *
 * `created` is the plan's: ids in the submission that are not among this
 * category's live lots as stored. Editing an existing lot keeps its id, so it
 * is never here, and a save that adds no lot never reaches the lookup.
 *
 * Why it matters: the write is an upsert on id, and a removed lot is archived
 * rather than deleted. A new lot carrying a taken id would therefore overwrite
 * that row — bringing a retired lot back as something else, with the old
 * lot's enquiries now pointing at it, or taking over a lot in another
 * category. The form mints ids that are free in the form; only the database
 * knows about the archived ones, so this is asked of the database.
 *
 * Only the form's save asks it. History restore legitimately brings an
 * archived lot back by its own id, and the lot-order save cannot add a lot.
 *
 * The lookup is passed in so `check:catalog` can run this against a fake.
 * A lookup that throws is left to throw: the caller refuses the save rather
 * than writing unchecked.
 */
export async function findReusedLotIds(
  created: string[],
  lookup: LotRowLookup
): Promise<string[]> {
  if (created.length === 0) return [];
  const existing = new Set(await lookup(created));
  return created.filter((id) => existing.has(id));
}

/** Every item id in an assembled category, in order. */
function itemIds(category: AuctionItem): string[] {
  return category.groups.flatMap((group) => group.items.map((item) => item.id));
}

/**
 * Works out the rows for a saved category, or refuses.
 *
 * Pure: it reads two documents and returns what to write. Nothing here touches
 * the database, which is what lets `check:catalog` run every real category
 * through it and compare the result against the rows that are already there.
 */
export function planCategoryWrite(
  next: AuctionItem,
  current: AuctionItem
): CategoryWritePlan {
  if (next.id !== current.id) {
    throw new CategoryWriteError("That category does not match the one being edited.");
  }

  /* ---- groups: same set, same count, only reordered or reworded ---- */
  const currentGroupIds = current.groups.map((g) => g.id);
  const nextGroupIds = next.groups.map((g) => g.id);

  if (nextGroupIds.length !== currentGroupIds.length) {
    throw new CategoryWriteError(
      "Groups cannot be added or removed here — removing one would delete the " +
        "lots inside it, and their ids are what enquiry links resolve through."
    );
  }
  for (const id of nextGroupIds) {
    if (!currentGroupIds.includes(id)) {
      throw new CategoryWriteError(`Group "${id}" does not belong to this category.`);
    }
  }

  /* ---- items: ids must be unique, and known ids must stay put ---- */
  const nextIds = itemIds(next);
  const duplicates = nextIds.filter((id, i) => nextIds.indexOf(id) !== i);
  if (duplicates.length > 0) {
    throw new CategoryWriteError(
      `Two lots share the identifier "${duplicates[0]}". Ids have to be unique — ` +
        `they are how an enquiry is traced back to a lot.`
    );
  }
  for (const id of nextIds) {
    if (!id.trim()) {
      throw new CategoryWriteError("A lot is missing its identifier.");
    }
  }

  const currentIds = new Set(itemIds(current));
  const created = nextIds.filter((id) => !currentIds.has(id));

  /**
   * Present before, gone now. Archived rather than deleted — see the note at
   * the top. This is the whole reason the current document is read before a
   * save rather than the form being trusted to describe the end state.
   */
  const archive = [...currentIds].filter((id) => !nextIds.includes(id));

  /* ---- the rows ---- */
  const category: CategoryRowPatch = {
    slug: next.slug,
    icon: next.icon,
    title: next.title,
    blurb: next.blurb,
    heading: next.heading,
    intro: next.intro,
    image_src: next.image.src,
    image_alt: next.image.alt,
    image_width: next.image.width ?? null,
    image_height: next.image.height ?? null,
    span: next.span ?? null,
    general_only: next.generalOnly ?? false,
    seo: next.seo,
  };

  const groups: GroupRowPatch[] = next.groups.map((group, index) => ({
    id: group.id,
    // Absent and empty are the same thing in a text column, and the schema
    // treats a missing title as "this group has no heading".
    title: group.title ?? null,
    blurb: group.blurb ?? null,
    // The tile's photograph, nulled the way a lot's is when it has none: a
    // cleared picture has to reach the row as null, or the tile would keep
    // showing the one the client just removed.
    cover_image_src: group.coverImage?.src ?? null,
    cover_image_alt: group.coverImage?.alt ?? null,
    cover_image_width: group.coverImage?.width ?? null,
    cover_image_height: group.coverImage?.height ?? null,
    position: index,
  }));

  const items: ItemRowPatch[] = next.groups.flatMap((group) =>
    group.items.map((item, index) => ({
      id: item.id,
      group_id: group.id,
      name: item.name,
      description: item.description,
      image_src: item.image?.src ?? null,
      image_alt: item.image?.alt ?? null,
      image_width: item.image?.width ?? null,
      image_height: item.image?.height ?? null,
      note: item.note ?? null,
      details: item.details ?? [],
      // The column is NOT NULL, so an unmarked lot writes false rather than
      // leaving the key out — same shape either way, which is what lets the
      // catalog check compare a planned row against a stored one.
      affordable_tier: item.affordableTier ?? false,
      // Nullable, unlike the flag above: "no brochure" and "a brochure named
      // nothing" have to be the same row, or an emptied field would store an
      // empty string that matches no document and reads as a value.
      document_slug: item.documentSlug ?? null,
      // Position is the order in the form. Archived rows keep whatever they
      // had; they are filtered out of every read, so a collision is invisible.
      position: index,
    }))
  );

  return { category, groups, items, archive, created };
}
