import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  GUITAR_GUIDE_DOCUMENT_SLUG,
  isHiddenPageSlug,
  resolveHiddenPage,
} from "@/content/hidden-pages";
import { HiddenPagePreviewFrame } from "@/components/admin/HiddenPagePreviewFrame";
import { SiteChrome } from "@/components/SiteChrome";
import { requireAdmin } from "@/lib/auth";
import { getDocumentSlugs } from "@/lib/documents";
import { readPageDocument } from "@/lib/admin/page-read";

/**
 * A hidden page as the site would render it, with the editor's UNSAVED
 * changes, for the preview column beside its form.
 *
 * Hidden pages only. The built-in pages' preview loads their public route,
 * which shows what is saved; these show what is typed, so Lauri can check a
 * price or a terms bullet before it goes live. Same mechanism as the Site
 * details preview: this route renders the saved document, and the panel posts
 * the form's contents in as they change (see HiddenPagePreviewFrame).
 *
 * It reads the row directly rather than through the cached `getHiddenPage`,
 * as every editor does, and falls back to the code's wording exactly as the
 * public route would.
 */

export const metadata: Metadata = {
  title: "Preview | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function HiddenPagePreviewRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  if (!isHiddenPageSlug(slug)) notFound();

  const [stored, documents] = await Promise.all([
    readPageDocument(slug),
    getDocumentSlugs(),
  ]);
  const { page } = resolveHiddenPage(slug, stored);
  const guideHref = documents.has(GUITAR_GUIDE_DOCUMENT_SLUG)
    ? `/d/${GUITAR_GUIDE_DOCUMENT_SLUG}`
    : null;

  return (
    <SiteChrome>
      <HiddenPagePreviewFrame saved={page} guideHref={guideHref} />
    </SiteChrome>
  );
}
