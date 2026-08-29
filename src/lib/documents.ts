import "server-only";

import { unstable_cache } from "next/cache";

import { getServiceClient } from "@/lib/supabase";
import { isDatabaseConfigured } from "@/lib/content-source";
import { BUILD_KEY } from "@/lib/build-key";
import { DOCUMENTS_TAG } from "@/lib/content-tags";
import { publicUrlFor } from "@/lib/admin/uploads";
import { isDocumentSlug } from "@/lib/admin/document-rules";

/**
 * The public half of a shareable document link.
 *
 * The point of `/d/<slug>` is that it is the address the client gives out — in
 * a newsletter, on a flyer, in an email that will still be forwarded next year.
 * So the link is the durable thing and the file behind it is not: replacing the
 * PDF repoints the row, and every copy of the link that has ever been sent
 * keeps working. That is the whole feature, and it is why the slug is a primary
 * key the admin chooses rather than an id.
 */

export interface PublicDocument {
  slug: string;
  title: string;
  filename: string;
  bytes: number;
  /** The object's own URL in storage. */
  url: string;
}

interface LinkRow {
  slug: string;
  title: string;
  uploads: { path: string; filename: string; bytes: number } | null;
}

/**
 * One wrapper for every slug, with the slug as an argument.
 *
 * The pages cache builds a wrapper per slug because `unstable_cache` fixes its
 * tags at creation time and each page needs its own. Here the tag is shared, so
 * a single wrapper does — and it has to, because a wrapper per slug requested
 * would be memory growth driven by whatever a scanner puts in the URL.
 */
const readDocument = unstable_cache(
  async (slug: string): Promise<PublicDocument | null> => {
    const { data, error } = await getServiceClient()
      .from("document_links")
      .select("slug, title, uploads(path, filename, bytes)")
      .eq("slug", slug)
      .maybeSingle<LinkRow>();

    if (error) {
      throw new Error(`[documents] could not read /d/${slug}: ${error.message}`);
    }
    if (!data?.uploads) return null;

    return {
      slug: data.slug,
      title: data.title,
      filename: data.uploads.filename,
      bytes: data.uploads.bytes,
      url: publicUrlFor(data.uploads.path),
    };
  },
  ["document", BUILD_KEY],
  { tags: [DOCUMENTS_TAG] }
);

/**
 * Every slug that resolves to a document today.
 *
 * One query, cached under the same tag as the documents themselves, because
 * the catalog needs to know which of its lots have a brochure and asking per
 * lot would be twenty-seven round trips to answer one question. Used to decide
 * whether to render a lot's download button at all: a slug that matches nothing
 * shows no button rather than a link to a 404.
 */
const readDocumentSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const { data, error } = await getServiceClient()
      .from("document_links")
      .select("slug");
    if (error) {
      throw new Error(`[documents] could not list the links: ${error.message}`);
    }
    return (data ?? []).map((row) => row.slug);
  },
  ["document-slugs", BUILD_KEY],
  { tags: [DOCUMENTS_TAG] }
);

export async function getDocumentSlugs(): Promise<Set<string>> {
  if (!isDatabaseConfigured()) return new Set();
  return new Set(await readDocumentSlugs());
}

/** The document a link points at today, or null if there is no such link. */
export async function getDocument(slug: string): Promise<PublicDocument | null> {
  if (!isDatabaseConfigured()) return null;
  if (!isDocumentSlug(slug)) return null;
  return readDocument(slug);
}
