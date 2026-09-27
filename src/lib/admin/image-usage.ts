import "server-only";

import { getServiceClient } from "@/lib/supabase";
import { IMAGE_BUCKET, imageUrlFor } from "@/lib/admin/uploads";
import { PAGE_LABELS, formatWhen, isPageSlug } from "@/lib/admin/page-meta";

/**
 * Where each uploaded photograph is used, and the library built on that.
 *
 * An upload is a row and an object; the content that shows it holds only its
 * public URL as a string. Nothing links the two — `image_upload_id` exists on
 * the catalog tables and nothing writes it — so "is this photograph on the
 * site" has one honest answer: read every document that can carry a picture
 * and look. That is eight page documents, the site record, the client's own
 * pages, and the three catalog tables with a picture on them — a category's
 * tile, a group's section tile, a lot's photograph. A few dozen rows behind an
 * admin login, read uncached, as every other admin list is.
 *
 * The scan is what makes deletion safe. The library shows a Delete button
 * only on a photograph nothing uses, and `deleteImage` runs the same scan
 * again before it acts — the button is a courtesy, the scan is the rule.
 *
 * What it cannot see is history. `content_revisions` holds full snapshots,
 * and a version restored from before a photograph was swapped out would
 * show a blank picture where the deleted one was. That is said in the
 * confirmation rather than guarded against: blocking every deletion that any
 * past version mentions would make the button useless within a month.
 */

export interface ImageUse {
  /** Worded for the client: "Catalog › Handbags › Spectacular Odyssey — Blue". */
  label: string;
  /** The admin screen that edits the record, so the use can be undone from here. */
  href: string;
}

/** The public URL's tail: everything after this is the object's path within the bucket. */
const MARKER = `/storage/v1/object/public/${IMAGE_BUCKET}/`;

/** The object path an image `src` refers to, or null when it is not an upload. */
export function uploadPathOf(src: string): string | null {
  const at = src.indexOf(MARKER);
  if (at === -1) return null;
  const path = src.slice(at + MARKER.length).split(/[?#]/)[0];
  return path || null;
}

/** Every string anywhere in a document, however deep. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object")
    for (const v of Object.values(value as Record<string, unknown>)) strings(v, out);
  return out;
}

type Uses = Map<string, ImageUse[]>;

function note(uses: Uses, src: string | null | undefined, use: ImageUse) {
  if (!src) return;
  const path = uploadPathOf(src);
  if (!path) return;
  const list = uses.get(path) ?? [];
  // One record may show the same photograph twice (a category tile that is
  // also a lot's picture). Once per record is what the client needs to know.
  if (!list.some((u) => u.href === use.href && u.label === use.label)) list.push(use);
  uses.set(path, list);
}

/**
 * Every place an uploaded photograph is shown, keyed by object path.
 *
 * Read fresh on each call. Reads that fail are logged and treated as empty,
 * which errs the wrong way for a delete — so `deleteImage` asks for the
 * strict form, which throws instead.
 */
export async function findImageUses(options: { strict?: boolean } = {}): Promise<Uses> {
  const supabase = getServiceClient();
  const uses: Uses = new Map();

  const fail = (what: string, message: string) => {
    if (options.strict) throw new Error(`could not read ${what}: ${message}`);
    console.error(`[images] could not read ${what} for the usage scan`, message);
  };

  const [pages, site, custom, categories, groups, items] = await Promise.all([
    supabase.from("pages").select("slug, data").returns<{ slug: string; data: unknown }[]>(),
    supabase.from("site_settings").select("data").eq("id", 1).maybeSingle<{ data: unknown }>(),
    supabase
      .from("custom_pages")
      .select("slug, data")
      .returns<{ slug: string; data: { title?: string } }[]>(),
    supabase
      .from("catalog_categories")
      .select("id, slug, title, image_src")
      .returns<{ id: string; slug: string; title: string; image_src: string }[]>(),
    supabase
      .from("catalog_groups")
      .select("id, category_id, title, cover_image_src")
      .returns<
        {
          id: string;
          category_id: string;
          title: string | null;
          cover_image_src: string | null;
        }[]
      >(),
    supabase
      .from("catalog_items")
      .select("id, group_id, name, image_src, published")
      .returns<
        { id: string; group_id: string; name: string; image_src: string | null; published: boolean }[]
      >(),
  ]);

  if (pages.error) fail("the pages", pages.error.message);
  for (const row of pages.data ?? []) {
    const label = isPageSlug(row.slug) ? `${PAGE_LABELS[row.slug]} page` : `/${row.slug}`;
    for (const s of strings(row.data)) note(uses, s, { label, href: `/admin/pages/${row.slug}` });
  }

  if (site.error) fail("the site record", site.error.message);
  for (const s of strings(site.data?.data)) {
    note(uses, s, { label: "Site header and footer", href: "/admin/site" });
  }

  if (custom.error) fail("your pages", custom.error.message);
  for (const row of custom.data ?? []) {
    const label = `Your pages › ${row.data?.title ?? `/${row.slug}`}`;
    for (const s of strings(row.data)) {
      note(uses, s, { label, href: `/admin/custom-pages/${row.slug}` });
    }
  }

  if (categories.error) fail("the catalog", categories.error.message);
  if (groups.error) fail("the catalog groups", groups.error.message);
  if (items.error) fail("the lots", items.error.message);

  const category = new Map((categories.data ?? []).map((c) => [c.id, c]));
  const categoryOfGroup = new Map((groups.data ?? []).map((g) => [g.id, g.category_id]));

  for (const c of categories.data ?? []) {
    note(uses, c.image_src, {
      label: `Catalog › ${c.title} (the tile)`,
      href: `/admin/catalog/${c.slug}`,
    });
  }
  /* A group's cover photograph. Counted like any other use, and for the same
     reason: without this the scan would call it unused, the library would offer
     a Delete button, and the section tile it is the whole point of would go
     blank with nothing having warned anyone. */
  for (const group of groups.data ?? []) {
    const c = category.get(group.category_id);
    note(uses, group.cover_image_src, {
      label: `Catalog › ${c?.title ?? "?"} › ${group.title ?? "this section"} (the section tile)`,
      href: c ? `/admin/catalog/${c.slug}` : "/admin/catalog",
    });
  }
  for (const item of items.data ?? []) {
    const c = category.get(categoryOfGroup.get(item.group_id) ?? "");
    // An archived lot still holds its picture: restoring the lot is one edit
    // away, and a restored lot with a blank picture is a worse surprise than
    // a photograph that says it is still in use.
    note(uses, item.image_src, {
      label: `Catalog › ${c?.title ?? "?"} › ${item.name}${item.published ? "" : " (archived)"}`,
      href: c ? `/admin/catalog/${c.slug}` : "/admin/catalog",
    });
  }

  return uses;
}

/* ------------------------------------------------------------------ */
/* The library                                                         */
/* ------------------------------------------------------------------ */

export interface LibraryEntry {
  id: string;
  src: string;
  filename: string;
  bytes: number;
  width: number | null;
  height: number | null;
  uploadedLabel: string;
  uploadedBy: string | null;
  usedBy: ImageUse[];
}

interface UploadRow {
  id: string;
  path: string;
  filename: string;
  bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
  admin_users: { name: string | null; email: string } | null;
}

/** Every photograph uploaded through the admin, newest first, with where it is used. */
export async function listLibrary(): Promise<{ entries: LibraryEntry[]; error: string | null }> {
  const [uploads, uses] = await Promise.all([
    getServiceClient()
      .from("uploads")
      .select("id, path, filename, bytes, width, height, created_at, admin_users(name, email)")
      .eq("bucket", IMAGE_BUCKET)
      .order("created_at", { ascending: false })
      .returns<UploadRow[]>(),
    findImageUses(),
  ]);

  const entries = (uploads.data ?? []).map((row) => ({
    id: row.id,
    src: imageUrlFor(row.path),
    filename: row.filename,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    uploadedLabel: formatWhen(row.created_at),
    uploadedBy: row.admin_users?.name ?? row.admin_users?.email ?? null,
    usedBy: uses.get(row.path) ?? [],
  }));

  return { entries, error: uploads.error?.message ?? null };
}
