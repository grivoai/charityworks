import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { Icon } from "@/components/Icon";
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
 * the same form landed on that lot (`?lot=<id>`). Nothing is edited here, so
 * there is one way to write a lot and it stays the form.
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

  return (
    <AdminShell admin={admin}>
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
          {sectioned ? ` in ${category.groups.length} sections` : ""}. Pick one to
          edit it, or edit the category itself — its title, descriptions,
          sections and search listing.
        </p>
      </div>

      {retired.count ? (
        <p className="admin-banner is-warn">
          {retired.count} lot{retired.count === 1 ? " is" : "s are"} retired from
          this category — off the site, but kept so older enquiry links still
          resolve. Re-adding a lot with the same identifier brings it back.
        </p>
      ) : null}

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

      {category.groups.map((group, g) =>
        group.items.length === 0 ? null : (
          <section key={group.id}>
            <h2 className="admin-lot-group">
              {sectioned
                ? group.title || `Section ${g + 1}`
                : "Lots"}
              <span className="admin-count-inline">{group.items.length}</span>
            </h2>
            <ul className="admin-rows">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`${editHref}?lot=${encodeURIComponent(item.id)}`}
                    className="admin-row admin-lot-row"
                  >
                    {item.image?.src ? (
                      <img
                        className="admin-lot-thumb"
                        src={item.image.src}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="admin-lot-thumb is-empty">No photo</span>
                    )}
                    <span className="admin-row-main">
                      <span className="admin-row-title">
                        {item.name}
                        {item.affordableTier ? (
                          <>
                            {" "}
                            <span className="admin-lot-star" title="Marked as one of the more affordable lots">
                              ★
                            </span>
                          </>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span className="admin-row-sub">{excerpt(item.description)}</span>
                      ) : null}
                    </span>
                    <span className="admin-row-go" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </AdminShell>
  );
}
