import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { RevisionList, type RevisionView } from "@/components/admin/RevisionList";
import { restoreCategoryRevision } from "@/lib/admin/catalog-actions";
import { requireAdmin } from "@/lib/auth";
import { getAuctionCategory } from "@/lib/content";
import { stableStringify } from "@/lib/admin/coerce";
import { listRevisions } from "@/lib/admin/revisions";
import { formatExact } from "@/lib/admin/page-meta";

export const metadata: Metadata = {
  title: "Version history | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  title: "Title",
  blurb: "Short description",
  heading: "Page heading",
  intro: "Introduction",
  image: "Picture",
  icon: "Icon",
  groups: "Lots",
  seo: "Search listing",
  span: "Tile size",
  generalOnly: "Listed without named lots",
};

function humanize(key: string): string {
  return LABELS[key] ?? key;
}

/** Which parts of a stored version differ from what is live. */
function changedSections(revision: unknown, current: unknown): string[] {
  if (!revision || typeof revision !== "object") return [];
  if (!current || typeof current !== "object") return [];

  const a = revision as Record<string, unknown>;
  const b = current as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  return [...keys]
    .filter((key) => key !== "id" && key !== "slug")
    .filter((key) => stableStringify(a[key]) !== stableStringify(b[key]))
    .map(humanize);
}

export default async function CategoryHistoryRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await requireAdmin();
  const { slug } = await params;

  const current = await getAuctionCategory(slug);
  if (!current) notFound();

  const revisions = await listRevisions("category", current.id);
  const currentKey = stableStringify(current);

  const views: RevisionView[] = revisions.map((revision) => ({
    id: revision.id,
    when: formatExact(revision.createdAt),
    note: revision.note,
    author: revision.authorName ?? revision.authorEmail,
    changed: changedSections(revision.data, current),
    // By value, not by "the newest row": a restore writes a new revision equal
    // to an older one, and both are then showing on the site.
    isCurrent: stableStringify(revision.data) === currentKey,
  }));

  return (
    <AdminShell admin={admin}>
      <nav className="admin-crumbs">
        <Link href="/admin">Site content</Link>
        <span aria-hidden="true">›</span>
        <Link href="/admin/catalog">Auction items</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/admin/catalog/${slug}`}>{current.title}</Link>
        <span aria-hidden="true">›</span>
        <span>History</span>
      </nav>

      <div className="admin-head">
        <h1>Version history</h1>
        <p>
          Every save of this category is kept. Restoring writes the old version
          back as a new save, so nothing is lost by trying one.
        </p>
      </div>

      <RevisionList
        slug={slug}
        revisions={views}
        action={restoreCategoryRevision}
        emptyMessage={
          "This category has not been edited yet, so there is nothing to go " +
          "back to. The first save will record what it looked like beforehand."
        }
      />
    </AdminShell>
  );
}
