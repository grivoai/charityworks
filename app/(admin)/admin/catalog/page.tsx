import Link from "next/link";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icon";
import { requireAdmin } from "@/lib/auth";
import { getAuctionCategories } from "@/lib/content";
import { getServiceClient } from "@/lib/supabase";
import { formatWhen } from "@/lib/admin/page-meta";

export const metadata: Metadata = {
  title: "Auction items | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

interface MetaRow {
  id: string;
  updated_at: string | null;
}

export default async function CatalogRoute() {
  const admin = await requireAdmin();

  const [categories, meta, retired] = await Promise.all([
    getAuctionCategories(),
    getServiceClient()
      .from("catalog_categories")
      .select("id, updated_at")
      .returns<MetaRow[]>(),
    // Lots that have been taken off the site. Worth surfacing: they are still
    // there, and "where did that go" is otherwise an unanswerable question.
    getServiceClient()
      .from("catalog_items")
      .select("id", { count: "exact", head: true })
      .eq("published", false),
  ]);

  const updatedById = new Map(
    (meta.data ?? []).map((row) => [row.id, row.updated_at])
  );

  const lots = categories.reduce(
    (total, category) =>
      total + category.groups.reduce((n, group) => n + group.items.length, 0),
    0
  );

  return (
    <AdminShell admin={admin}>
      <nav className="admin-crumbs">
        <Link href="/admin">Site content</Link>
        <span aria-hidden="true">›</span>
        <span>Auction items</span>
      </nav>

      <div className="admin-head">
        <h1>Auction items</h1>
        <p>
          {categories.length} categories, {lots} lots on the site
          {retired.count ? `, ${retired.count} retired` : ""}. Editing a category
          changes its own page, the tiles on the home and auction items pages,
          and the auction planner&rsquo;s suggestions.
        </p>
      </div>

      <ul className="admin-rows">
        {categories.map((category) => {
          const count = category.groups.reduce((n, g) => n + g.items.length, 0);
          return (
            <li key={category.id}>
              <Link href={`/admin/catalog/${category.slug}`} className="admin-row">
                <span className="admin-row-main">
                  <span className="admin-row-title">
                    <span aria-hidden="true"><Icon name={category.icon} /></span> {category.title}
                  </span>
                  <span className="admin-row-sub">
                    {count === 0
                      ? "Described rather than listed"
                      : `${count} lot${count === 1 ? "" : "s"}`}
                    {category.groups.length > 1
                      ? ` in ${category.groups.length} groups`
                      : ""}
                  </span>
                </span>
                <span className="admin-row-meta">
                  {formatWhen(updatedById.get(category.id))}
                </span>
                <span className="admin-row-go" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
