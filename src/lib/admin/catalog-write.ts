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
      // Position is the order in the form. Archived rows keep whatever they
      // had; they are filtered out of every read, so a collision is invisible.
      position: index,
    }))
  );

  return { category, groups, items, archive, created };
}
