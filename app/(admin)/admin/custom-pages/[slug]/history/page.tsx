import Link from "next/link";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { RevisionList, type RevisionView } from "@/components/admin/RevisionList";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { stableStringify } from "@/lib/admin/coerce";
import { humanize } from "@/lib/admin/schema-tree";
import { listRevisions } from "@/lib/admin/revisions";
import { formatExact } from "@/lib/admin/page-meta";
import { restoreCustomPageRevision } from "@/lib/admin/custom-page-actions";

export const metadata: Metadata = {
  title: "Page history | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

function changedSections(revision: unknown, current: unknown): string[] {
  if (!revision || typeof revision !== "object") return [];
  if (!current || typeof current !== "object") return [];
  const a = revision as Record<string, unknown>;
  const b = current as Record<string, unknown>;
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((key) => key !== "slug")
    .filter((key) => stableStringify(a[key]) !== stableStringify(b[key]))
    .map(humanize);
}

export default async function CustomPageHistoryRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await requireAdmin();
  const { slug } = await params;

  const [revisions, row] = await Promise.all([
    listRevisions("custom-page", slug),
    getServiceClient()
      .from("custom_pages")
      .select("data")
      .eq("slug", slug)
      .maybeSingle<{ data: unknown }>(),
  ]);

  const current = row.data?.data;
  const currentKey = stableStringify(current);

  const views: RevisionView[] = revisions.map((revision) => ({
    id: revision.id,
    when: formatExact(revision.createdAt),
    note: revision.note,
    author: revision.authorName ?? revision.authorEmail,
    changed: changedSections(revision.data, current),
    isCurrent: stableStringify(revision.data) === currentKey,
  }));

  return (
    <AdminShell admin={admin}>
      <nav className="admin-crumbs">
        <Link href="/admin/custom-pages">Your pages</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/admin/custom-pages/${slug}`}>{slug}</Link>
        <span aria-hidden="true">›</span>
        <span>History</span>
      </nav>

      <div className="admin-head">
        <h1>Version history</h1>
        <p>
          Every save of this page, newest first. Restoring keeps the version you
          are replacing, so a restore can itself be undone.
        </p>
      </div>

      <RevisionList
        slug={slug}
        revisions={views}
        action={restoreCustomPageRevision}
        emptyMessage="This page has not been edited since it was created."
      />
    </AdminShell>
  );
}
