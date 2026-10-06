import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icon";
import { LotOrder, type LotSection } from "@/components/admin/LotOrder";
import { PagePreview } from "@/components/admin/PagePreview";
import { requireAdmin } from "@/lib/auth";
import { getAuctionCategory } from "@/lib/content";
import { getServiceClient } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Category | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/** Enough of a description to tell two similar lots apart at a glance. */
function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 90 ? `${flat.slice(0, 90).trimEnd()}…` : flat;
}

/**
 * A category's lots, one row each, ahead of the form that edits them.
 *
 * The form holds every lot expanded, which for Gold Album Showcase is a very
 * long page to scroll for one entry. This is the index into it: a click opens
 * the same form landed on that lot (`?lot=<id>`).
 *
 * It is also where the lots are put in order, which is the one thing written
 * from here. The form can do that too and could not do it well: an expanded lot
 * is around sixteen hundred pixels tall, so the two lots being swapped are
 * never on screen together and the drag has nowhere to land. One row each, they
 * are. The write is still narrow — `saveLotOrder` takes a permutation of the
 * ids it already holds and refuses anything else — so a lot is still only ever
 * EDITED in the form.
 *
 * Read through the content layer like the form, so the list and the form
 * cannot disagree about what is in the category.
 */
export default async function CategoryLotsRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await requireAdmin();
  const { slug } = await params;

  const category = await getAuctionCategory(slug);
  if (!category) notFound();

  const lots = category.groups.reduce((n, group) => n + group.items.length, 0);

  // A category described rather than listed has nothing to pick from; a page
  // with only an "edit" button on it would be a click for nothing.
  if (lots === 0) redirect(`/admin/catalog/${category.slug}/edit`);

  const retired = await getServiceClient()
    .from("catalog_items")
    .select("id", { count: "exact", head: true })
    .eq("published", false)
    .in(
      "group_id",
      category.groups.map((group) => group.id)
    );

  const editHref = `/admin/catalog/${category.slug}/edit`;
  const sectioned = category.groups.length > 1;

  /**
   * Just the parts of a lot a row shows.
   *
   * Narrowed here rather than handing the whole category over, because every
   * field sent reaches the browser as part of the client component's payload —
   * and a category's descriptions, details and photograph dimensions are a lot
   * of bytes for a list that shows a name and one line.
   */
  const sections: LotSection[] = category.groups.map((group) => ({
    id: group.id,
    title: group.title ?? "",
    lots: group.items.map((item) => ({
      id: item.id,
      name: item.name,
      excerpt: item.description ? excerpt(item.description) : "",
      image: item.image?.src ?? null,
      affordable: Boolean(item.affordableTier),
    })),
  }));

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
          {lots} lot{lots === 1 ? "" : "s"}
          {sectioned ? ` in ${category.groups.length} sections` : ""}. Drag a lot
          by its handle, or use the arrows, to change the order they appear in on
          the site — then save. Pick one to edit it, or edit the category itself
          — its title, descriptions, sections and search listing.
        </p>
      </div>

      {retired.count ? (
        <p className="admin-banner is-warn">
          {retired.count} lot{retired.count === 1 ? " is" : "s are"} retired from
          this category — off the site, but kept so older enquiry links still
          resolve. Re-adding a lot with the same identifier brings it back.
        </p>
      ) : null}

      {/* The same two columns as the form, with the live page on the right.
          Browse only: "Point & edit" finds a clicked element's field in the
          form beside it, and there is no form beside it here — the mode would
          take every click and do nothing with it. A lot is opened from its row.
          The frame re-fetches itself when an order is saved, so the page on the
          right is what the new order looks like. */}
      <div className="admin-split has-preview">
        <div className="admin-split-editor">
          <ul className="admin-rows">
            <li>
              <Link href={editHref} className="admin-row admin-lot-head">
                <span className="admin-row-main">
                  <span className="admin-row-title">Category details</span>
                  <span className="admin-row-sub">
                    Title, descriptions, tile photo, sections, search listing
                  </span>
                </span>
                <span className="admin-row-go" aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          </ul>

          <LotOrder
            slug={category.slug}
            sections={sections}
            sectioned={sectioned}
            editHref={editHref}
          />
        </div>

        <PagePreview
          slug={category.slug}
          path={`/auction-items/${category.slug}`}
          label={category.title}
          canPointAndEdit={false}
          pages={[]}
          foot={
            "The category page as it is live now — it reloads when a new order " +
            "is saved. Pick a lot on the left to edit it."
          }
        />
      </div>
    </AdminShell>
  );
}
