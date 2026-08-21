import Link from "next/link";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  RevisionList,
  type RevisionView,
} from "@/components/admin/RevisionList";
import { requireAdmin } from "@/lib/auth";
import { getSite } from "@/lib/content";
import { stableStringify } from "@/lib/admin/coerce";
import { humanize } from "@/lib/admin/schema-tree";
import { listRevisions } from "@/lib/admin/revisions";
import { formatExact } from "@/lib/admin/page-meta";
import { restoreSiteRevision } from "@/lib/admin/site-actions";
import { SITE_ENTITY_ID } from "@/lib/admin/site-read";

export const metadata: Metadata = {
  title: "Site details history | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Which top-level sections of a stored version differ from what is live.
 * Same shape of answer as the page history: enough to pick the version worth
 * restoring, without rendering a full diff nobody reads.
 */
function changedSections(revision: unknown, current: unknown): string[] {
  if (!revision || typeof revision !== "object") return [];
  if (!current || typeof current !== "object") return [];

  const a = revision as Record<string, unknown>;
  const b = current as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  return [...keys]
    .filter((key) => stableStringify(a[key]) !== stableStringify(b[key]))
    .map(humanize);
}

export default async function SiteHistoryRoute() {
  const admin = await requireAdmin();

  const [revisions, current] = await Promise.all([
    listRevisions("site", SITE_ENTITY_ID),
    getSite(),
  ]);

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
        <Link href="/admin/site">Site details</Link>
        <span aria-hidden="true">›</span>
        <span>History</span>
      </nav>

      <div className="admin-head">
        <h1>Version history</h1>
        <p>
          Every save of the site details, newest first. Restoring puts those
          details back across the whole site and keeps everything else —
          including the version you are replacing, so a restore can itself be
          undone.
        </p>
      </div>

      <RevisionList
        slug="site"
        revisions={views}
        action={restoreSiteRevision}
        emptyMessage={
          "The site details have not been edited yet, so there is nothing to go " +
          "back to. The first save will record what they were beforehand."
        }
      />
    </AdminShell>
  );
}
