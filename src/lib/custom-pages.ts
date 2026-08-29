import "server-only";

import { unstable_cache } from "next/cache";

import { customPageSchema, type CustomPage } from "@/content/schema";
import { getServiceClient } from "@/lib/supabase";
import { isDatabaseConfigured } from "@/lib/content-source";
import { BUILD_KEY } from "@/lib/build-key";
import { CUSTOM_PAGES_TAG, customPageTag } from "@/lib/content-tags";

/**
 * Reading the pages the client built.
 *
 * Deliberately NOT part of the `ContentSource` interface. That interface has
 * two implementations — Supabase and the seed content in `src/content` — and
 * the seed one exists so the site still builds with no database at all. Custom
 * pages have no seed equivalent and never will: they are, by definition, things
 * that were created after the site shipped. Widening the interface would force
 * `content-source-seed.ts` to implement a method whose only honest answer is
 * "none", which reads like an oversight rather than a fact.
 *
 * So this goes straight to the database and answers "none" itself when there is
 * no database, which is the same outcome by a route that says what it means.
 */

/** What the nav, the sitemap and the admin list need — not the whole document. */
export interface CustomPageSummary {
  slug: string;
  title: string;
  visibility: CustomPage["visibility"];
}

interface Row {
  slug: string;
  data: unknown;
  published: boolean;
  updated_at: string | null;
}

/**
 * One published page, or null.
 *
 * A row that fails its schema returns null rather than throwing. The built-in
 * pages throw on a schema mismatch, and should — there are eight of them, they
 * are all in every build, and a broken one is a deployment fault worth
 * stopping for. A custom page is one row among many that a client can create at
 * any time, so a bad one has to degrade to a 404 on that address instead of
 * taking down whatever else was being rendered.
 */
async function readCustomPage(slug: string): Promise<CustomPage | null> {
  if (!isDatabaseConfigured()) return null;

  const { data, error } = await getServiceClient()
    .from("custom_pages")
    .select("slug, data, published, updated_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle<Row>();

  if (error) {
    console.error(`[custom-pages] could not read ${slug}`, error.message);
    return null;
  }
  if (!data) return null;

  const parsed = customPageSchema.safeParse(data.data);
  if (!parsed.success) {
    console.error(
      `[custom-pages] ${slug} does not match the schema: ` +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.map(String).join(".")} ${i.message}`)
          .join("; ")
    );
    return null;
  }
  return parsed.data;
}

/**
 * One cached reader per slug, so a page's tag invalidates that page.
 *
 * Same reasoning as `readerFor` in content.ts: `unstable_cache` binds its tags
 * when the wrapper is made, not when it is called, so one shared wrapper could
 * only carry one tag for every page at once.
 *
 * Unlike the built-in pages there is no fixed set of slugs here, so this map
 * grows with whatever is requested.
 *
 * THAT USED TO BE JUSTIFIED BY THE SLUG GUARDRAILS, AND THEY ARE NOT ENOUGH.
 * `couldBeCustomPage()` checks the shape of an address, a reserved list and a
 * length cap — every well-formed lowercase-hyphen slug up to 60 characters
 * passes it, which is an unbounded keyspace, not a bounded one. Measured
 * against the built app, twelve invented addresses produced twelve database
 * reads, twelve permanent entries in this map, and twelve Data Cache entries
 * holding `null` for a year. A crawler walking a wordlist drives all three.
 *
 * So membership is checked against the published set first. That list is one
 * cached read the site already makes — the nav, the sitemap and
 * `generateStaticParams` all use it — so the check is free in the common case,
 * and a reader is only ever built for a slug that resolves to a real page.
 * The map is now bounded by the number of published pages.
 */
const readers = new Map<string, () => Promise<CustomPage | null>>();

export async function getCustomPage(slug: string): Promise<CustomPage | null> {
  /* Before the map, not after: the point is to never build a wrapper for an
     address nobody published. Returning null here is the same answer the
     reader would have given, one round trip and one permanent map entry
     cheaper. */
  const published = await getPublishedCustomPages();
  if (!published.some((page) => page.slug === slug)) return null;

  let reader = readers.get(slug);
  if (!reader) {
    reader = unstable_cache(
      () => readCustomPage(slug),
      ["custom-page", slug, BUILD_KEY],
      { tags: [customPageTag(slug)] }
    );
    readers.set(slug, reader);
  }
  return reader();
}

const readPublished = unstable_cache(
  async (): Promise<CustomPageSummary[]> => {
    if (!isDatabaseConfigured()) return [];

    const { data, error } = await getServiceClient()
      .from("custom_pages")
      .select("slug, data, published, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .returns<Row[]>();

    if (error) {
      console.error("[custom-pages] could not list", error.message);
      return [];
    }

    const summaries: CustomPageSummary[] = [];
    for (const row of data ?? []) {
      const parsed = customPageSchema.safeParse(row.data);
      // Skipped rather than surfaced broken — see readCustomPage.
      if (!parsed.success) continue;
      summaries.push({
        slug: parsed.data.slug,
        title: parsed.data.title,
        visibility: parsed.data.visibility,
      });
    }
    return summaries;
  },
  ["custom-pages", BUILD_KEY],
  { tags: [CUSTOM_PAGES_TAG] }
);

/** Every published custom page, listed and unlisted alike. */
export async function getPublishedCustomPages(): Promise<CustomPageSummary[]> {
  return readPublished();
}

/**
 * The ones that may appear in navigation and the sitemap.
 *
 * The single place `visibility` is turned into a decision, so "unlisted" cannot
 * come to mean one thing in the nav and another in the sitemap.
 */
export async function getListedCustomPages(): Promise<CustomPageSummary[]> {
  return (await getPublishedCustomPages()).filter(
    (page) => page.visibility === "public"
  );
}
