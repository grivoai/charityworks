import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  RevisionList,
  type RevisionView,
} from "@/components/admin/RevisionList";
import { requireAdmin } from "@/lib/auth";
import { getPage } from "@/lib/content";
import { stableStringify } from "@/lib/admin/coerce";
import { humanize } from "@/lib/admin/schema-tree";
import { listRevisions } from "@/lib/admin/revisions";
import {
  PAGE_LABELS,
  formatExact,
  isPageSlug,
} from "@/lib/admin/page-meta";

export const metadata: Metadata = {
  title: "Version history | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Which top-level sections of a stored version differ from what is live.
 *
 * A full diff would be more precise and much harder to read. "Differs in:
 * Questions" is enough to find the version worth restoring, which is the only
 * decision being made on this screen.
 */
function changedSections(revision: unknown, current: unknown): string[] {
  if (!revision || typeof revision !== "object") return [];
  if (!current || typeof current !== "object") return [];

  const a = revision as Record<string, unknown>;
  const b = current as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  return [...keys]
    .filter((key) => key !== "slug")
    .filter((key) => stableStringify(a[key]) !== stableStringify(b[key]))
    .map(humanize);
}

export default async function PageHistoryRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await requireAdmin();
  const { slug } = await params;

  if (!isPageSlug(slug)) notFound();

  const [revisions, current] = await Promise.all([
    listRevisions("page", slug),
    getPage(slug),
  ]);

  const currentKey = stableStringify(current);

  const views: RevisionView[] = revisions.map((revision) => ({
    id: revision.id,
    when: formatExact(revision.createdAt),
    note: revision.note,
    author: revision.authorName ?? revision.authorEmail,
    changed: changedSections(revision.data, current),
    // Compared by value rather than by "is it the newest row", so a save whose
    // history write failed cannot leave an older entry mislabelled as live.
    isCurrent: stableStringify(revision.data) === currentKey,
  }));

  return (
    <AdminShell admin={admin}>
      <nav className="admin-crumbs">
        <Link href="/admin">Site content</Link>
        <span aria-hidden="true">›</span>
        <Link href="/admin/pages">Page text</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/admin/pages/${slug}`}>{PAGE_LABELS[slug]}</Link>
        <span aria-hidden="true">›</span>
        <span>History</span>
      </nav>

      <div className="admin-head">
        <h1>Version history</h1>
        <p>
          Every save of the {PAGE_LABELS[slug].toLowerCase()} page, newest first.
          Restoring puts that wording back on the site and keeps everything else
          — including the version you are replacing, so a restore can itself be
          undone.
        </p>
      </div>

      <RevisionList slug={slug} revisions={views} />
    </AdminShell>
  );
}
