import Link from "next/link";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import {
  PAGE_LABELS,
  PAGE_ORDER,
  PAGE_PATHS,
  formatWhen,
  isPageSlug,
} from "@/lib/admin/page-meta";

export const metadata: Metadata = {
  title: "Page text | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

/** Reads the session cookie, so it is per-request by definition. */
export const dynamic = "force-dynamic";

interface PageRow {
  slug: string;
  updated_at: string | null;
}

export default async function PagesIndex() {
  const admin = await requireAdmin();

  const { data, error } = await getServiceClient()
    .from("pages")
    .select("slug, updated_at")
    .returns<PageRow[]>();

  if (error) {
    throw new Error(`[admin] could not list pages: ${error.message}`);
  }

  const updatedBySlug = new Map(
    (data ?? []).map((row) => [row.slug, row.updated_at])
  );

  // Listed in navigation order rather than the order Postgres returns them.
  const pages = PAGE_ORDER.filter(isPageSlug);

  return (
    <AdminShell admin={admin}>
      <nav className="admin-crumbs">
        <Link href="/admin">Site content</Link>
        <span aria-hidden="true">›</span>
        <span>Page text</span>
      </nav>

      <div className="admin-head">
        <h1>Page text</h1>
        <p>
          The headings, wording and button labels on each page. The auction
          catalog is edited separately, because a lot belongs to a category
          rather than to a page.
        </p>
      </div>

      <ul className="admin-rows">
        {pages.map((slug) => (
          <li key={slug}>
            <Link href={`/admin/pages/${slug}`} className="admin-row">
              <span className="admin-row-main">
                <span className="admin-row-title">{PAGE_LABELS[slug]}</span>
                <span className="admin-row-sub">{PAGE_PATHS[slug]}</span>
              </span>
              <span className="admin-row-meta">
                Edited {formatWhen(updatedBySlug.get(slug))}
              </span>
              <span className="admin-row-go" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
