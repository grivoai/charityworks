import Link from "next/link";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import {
  HIDDEN_PAGE_LABELS,
  HIDDEN_PAGE_PATHS,
  HIDDEN_PAGE_SLUGS,
} from "@/content/hidden-pages";
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

      <div className="admin-head">
        <h1>Page text</h1>
        <p>
          The headings, wording and button labels on each page. The auction
          catalog is edited separately, because a lot belongs to a category
          rather than to a page.
        </p>
        <p>
          These eight have fixed layouts and cannot be added to or removed. To
          make a new page of your own, go to{" "}
          <Link href="/admin/custom-pages">Your pages</Link>.
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

      {/* The three old-site addresses that are handed out but never listed.
          Edited with the same form; see src/content/hidden-pages.ts. */}
      <div className="admin-head" style={{ marginTop: "2rem" }}>
        <h2>Hidden pages</h2>
        <p>
          Pages that only people with the link can open. They are not in the
          menu, the footer or search results, and saving keeps them that way.
          Their web addresses are printed on vouchers, so they never change.
        </p>
      </div>

      <ul className="admin-rows">
        {HIDDEN_PAGE_SLUGS.map((slug) => (
          <li key={slug}>
            <Link href={`/admin/pages/${slug}`} className="admin-row">
              <span className="admin-row-main">
                <span className="admin-row-title">{HIDDEN_PAGE_LABELS[slug]}</span>
                <span className="admin-row-sub">{HIDDEN_PAGE_PATHS[slug]}</span>
              </span>
              <span className="admin-row-meta">
                {updatedBySlug.get(slug)
                  ? `Edited ${formatWhen(updatedBySlug.get(slug))}`
                  : "Not edited yet"}
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
