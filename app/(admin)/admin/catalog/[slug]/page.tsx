import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auctionItemSchema } from "@/content/schema";
import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icon";
import { CategoryEditor } from "@/components/admin/CategoryEditor";
import { PagePreview } from "@/components/admin/PagePreview";
import { requireAdmin } from "@/lib/auth";
import { getAuctionCategories, getAuctionCategory } from "@/lib/content";
import { getServiceClient } from "@/lib/supabase";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForCategory } from "@/lib/admin/locks";
import { countRevisions } from "@/lib/admin/revisions";
import { formatWhen } from "@/lib/admin/page-meta";

export const metadata: Metadata = {
  title: "Edit category | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

interface MetaRow {
  updated_at: string | null;
}

export default async function EditCategoryRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ restored?: string }>;
}) {
  const admin = await requireAdmin();
  const { slug } = await params;
  const { restored } = await searchParams;

  /**
   * Read through the content layer, so the editor is populated with exactly
   * what the site renders — same assembly from the same three tables, checked
   * by the same schema. A separate read here could differ from what is live,
   * and the difference would only ever show up as a mystery.
   */
  const category = await getAuctionCategory(slug);
  if (!category) notFound();

  const [historyCount, meta, retired, siblings] = await Promise.all([
    countRevisions("category", category.id),
    getServiceClient()
      .from("catalog_categories")
      // No `updated_by` on this table — unlike `pages`, a category records when
      // it changed but not who changed it.
      .select("updated_at")
      .eq("id", category.id)
      .maybeSingle<MetaRow>(),
    getServiceClient()
      .from("catalog_items")
      .select("id, name, group_id", { count: "exact" })
      .eq("published", false)
      .in(
        "group_id",
        category.groups.map((group) => group.id)
      ),
    // Every category, so browsing from one to another in the preview can offer
    // the right editor rather than silently editing the wrong record.
    getAuctionCategories(),
  ]);

  const tree = buildFieldTree(auctionItemSchema, locksForCategory());

  const updatedLabel = meta.data?.updated_at
    ? `Last edited ${formatWhen(meta.data.updated_at)}`
    : "Not edited since the site was set up";

  const lots = category.groups.reduce((n, group) => n + group.items.length, 0);

  const categoryPath = `/auction-items/${category.slug}`;

  return (
    <AdminShell admin={admin} wide>
      <nav className="admin-crumbs">
        <Link href="/admin/catalog">Auction items</Link>
        <span aria-hidden="true">›</span>
        <span>{category.title}</span>
      </nav>

      <div className="admin-head">
        <h1>
          <span aria-hidden="true"><Icon name={category.icon} /></span> {category.title}
        </h1>
        <p>
          {lots} lot{lots === 1 ? "" : "s"}. Saving publishes straight to{" "}
          <a href={`/auction-items/${category.slug}`} target="_blank" rel="noreferrer">
            /auction-items/{category.slug}
          </a>
          , and updates the tiles on the home and auction items pages and the
          planner&rsquo;s suggestions. Every save is kept.
        </p>
      </div>

      {retired.count ? (
        <p className="admin-banner is-warn">
          {retired.count} lot{retired.count === 1 ? " is" : "s are"} retired from
          this category — off the site, but kept so older enquiry links still
          resolve. Re-adding a lot with the same identifier brings it back.
        </p>
      ) : null}

      {/* The same two columns as the pages editor, and the same component:
          the preview is a locator into this form, not a second way to write.
          A category is one record on four surfaces, and this is the one that
          shows nearly all of its words — the tiles elsewhere carry the rest,
          which is written down in CATALOG_NOT_VISIBLE. */}
      <div className="admin-split has-preview">
        <div className="admin-split-editor">
          <CategoryEditor
            slug={category.slug}
            tree={tree}
            initial={category as unknown as Record<string, unknown>}
            historyCount={historyCount}
            updatedLabel={updatedLabel}
            restored={restored === "1"}
          />
        </div>

        <PagePreview
          slug={category.slug}
          path={categoryPath}
          label={category.title}
          pages={siblings.map((c) => ({
            slug: c.slug,
            label: c.title,
            path: `/auction-items/${c.slug}`,
            editorHref: `/admin/catalog/${c.slug}`,
          }))}
        />
      </div>
    </AdminShell>
  );
}
