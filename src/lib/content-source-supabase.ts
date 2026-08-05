import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import type {
  AnyPage,
  AuctionItem,
  ImageRef,
  PageMap,
  PageSlug,
  SiteContent,
} from "@/content/types";
import type { ContentSource } from "@/lib/content-source";
import {
  anyPageSchema,
  auctionItemSchema,
  pageSchemas,
  siteContentSchema,
} from "@/content/schema";
import { getServiceClient } from "@/lib/supabase";

/**
 * Content read from the database the admin panel writes to.
 *
 * Two rules run through this file.
 *
 * FAIL LOUDLY. Every query error throws, and every row is parsed through its
 * Zod schema before it is returned. A missing row, a failed connection or a
 * column that no longer matches the schema stops the build. The alternative —
 * degrading to partial content — produces a site that looks deployed and is
 * quietly wrong, which is the worst outcome available.
 *
 * REBUILD THE SHAPE THE SITE ALREADY EXPECTS. Categories live across three
 * tables because the admin needs to add a lot without rewriting a blob, but
 * routes still receive the same nested `AuctionItem` Phase 1 handed them. The
 * normalisation is this file's problem, not theirs.
 */

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

interface PageRow {
  slug: string;
  data: unknown;
}

interface SiteRow {
  data: unknown;
}

interface CategoryRow {
  id: string;
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
  position: number;
}

interface GroupRow {
  id: string;
  category_id: string;
  title: string | null;
  blurb: string | null;
  position: number;
}

interface ItemRow {
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

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function fail(what: string, error: PostgrestError | null): never {
  throw new Error(
    `[content] failed to read ${what} from the database: ` +
      `${error?.message ?? "no rows returned"}` +
      (error?.hint ? ` (${error.hint})` : "")
  );
}

/** Drops nulls so an absent column becomes an absent key, which is what the schemas expect. */
function imageOf(row: {
  image_src: string | null;
  image_alt: string | null;
  image_width: number | null;
  image_height: number | null;
}): ImageRef | undefined {
  if (!row.image_src) return undefined;
  return {
    src: row.image_src,
    alt: row.image_alt ?? "",
    ...(row.image_width ? { width: row.image_width } : {}),
    ...(row.image_height ? { height: row.image_height } : {}),
  };
}

function omitNull<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/* ------------------------------------------------------------------ */
/* Source                                                              */
/* ------------------------------------------------------------------ */

export const supabaseContentSource: ContentSource = {
  async getSite(): Promise<SiteContent> {
    const { data, error } = await getServiceClient()
      .from("site_settings")
      .select("data")
      .eq("id", 1)
      .maybeSingle<SiteRow>();

    if (error || !data) fail("site settings", error);

    const parsed = siteContentSchema.safeParse(data.data);
    if (!parsed.success) {
      throw new Error(
        `[content] the site_settings row does not match the schema: ` +
          parsed.error.issues
            .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
            .join("; ")
      );
    }

    return parsed.data;
  },

  async getPage<S extends PageSlug>(slug: S): Promise<PageMap[S]> {
    const { data, error } = await getServiceClient()
      .from("pages")
      .select("slug, data")
      .eq("slug", slug)
      .maybeSingle<PageRow>();

    if (error || !data) fail(`page "${slug}"`, error);

    const parsed = pageSchemas[slug].safeParse(data.data);
    if (!parsed.success) {
      throw new Error(
        `[content] the "${slug}" page row does not match its schema: ` +
          parsed.error.issues
            .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
            .join("; ")
      );
    }

    // The map from slug to schema guarantees this pairing; TypeScript cannot
    // follow the generic through the lookup.
    return parsed.data as PageMap[S];
  },

  async getAllPages(): Promise<AnyPage[]> {
    const { data, error } = await getServiceClient()
      .from("pages")
      .select("slug, data")
      .returns<PageRow[]>();

    if (error || !data) fail("pages", error);

    return data.map((row) => {
      const parsed = anyPageSchema.safeParse(row.data);
      if (!parsed.success) {
        throw new Error(
          `[content] the "${row.slug}" page row does not match its schema: ` +
            parsed.error.issues
              .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
              .join("; ")
        );
      }
      return parsed.data;
    });
  },

  async getAuctionCategories(): Promise<AuctionItem[]> {
    const supabase = getServiceClient();

    /* Three flat queries rather than a nested select. The join would return the
       tree in one round trip, but the ordering of nested rows is awkward to
       express and easy to get subtly wrong — and a catalog that renders its
       lots in an arbitrary order is a bug nobody notices until the client
       does. Three ordered reads of a few hundred rows, at build time only. */
    const [categories, groups, items] = await Promise.all([
      supabase
        .from("catalog_categories")
        .select("*")
        .eq("published", true)
        .order("position")
        .returns<CategoryRow[]>(),
      supabase
        .from("catalog_groups")
        .select("*")
        .order("position")
        .returns<GroupRow[]>(),
      supabase
        .from("catalog_items")
        .select("*")
        .eq("published", true)
        .order("position")
        .returns<ItemRow[]>(),
    ]);

    if (categories.error || !categories.data) fail("catalog categories", categories.error);
    if (groups.error || !groups.data) fail("catalog groups", groups.error);
    if (items.error || !items.data) fail("catalog items", items.error);

    const itemsByGroup = new Map<string, ItemRow[]>();
    for (const item of items.data) {
      const list = itemsByGroup.get(item.group_id);
      if (list) list.push(item);
      else itemsByGroup.set(item.group_id, [item]);
    }

    const groupsByCategory = new Map<string, GroupRow[]>();
    for (const group of groups.data) {
      const list = groupsByCategory.get(group.category_id);
      if (list) list.push(group);
      else groupsByCategory.set(group.category_id, [group]);
    }

    return categories.data.map((category) => {
      const shaped = {
        id: category.id,
        slug: category.slug,
        icon: category.icon,
        title: category.title,
        blurb: category.blurb,
        image: {
          src: category.image_src,
          alt: category.image_alt,
          ...(category.image_width ? { width: category.image_width } : {}),
          ...(category.image_height ? { height: category.image_height } : {}),
        },
        ...(category.span ? { span: category.span } : {}),
        heading: category.heading,
        intro: category.intro,
        seo: category.seo,
        groups: (groupsByCategory.get(category.id) ?? []).map((group) => ({
          id: group.id,
          ...(group.title ? { title: group.title } : {}),
          ...(group.blurb ? { blurb: group.blurb } : {}),
          items: (itemsByGroup.get(group.id) ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            ...(imageOf(item) ? { image: imageOf(item) } : {}),
            ...(item.note ? { note: item.note } : {}),
            ...(Array.isArray(item.details) && item.details.length > 0
              ? { details: item.details }
              : {}),
          })),
        })),
        ...(category.general_only ? { generalOnly: true } : {}),
      };

      const parsed = auctionItemSchema.safeParse(shaped);
      if (!parsed.success) {
        throw new Error(
          `[content] category "${category.id}" does not match the schema: ` +
            parsed.error.issues
              .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
              .join("; ")
        );
      }

      return parsed.data;
    });
  },
};

/* `omitNull` is exported for the admin's write path, which maps the other way. */
export { omitNull };
