import Link from "next/link";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { CreatePageForm } from "@/components/admin/CreatePageForm";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { formatWhen } from "@/lib/admin/page-meta";
import { customPageSchema } from "@/content/schema";

export const metadata: Metadata = {
  title: "Your pages | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

interface Row {
  slug: string;
  data: unknown;
  published: boolean;
  updated_at: string | null;
}

/**
 * The pages the client has built, and the form that makes another.
 *
 * Separate from /admin/pages because they are a genuinely different thing: the
 * eight there have fixed shapes and hand-written layouts and cannot be created
 * or deleted, and these are assembled from blocks and can. Listing them
 * together would suggest the same operations apply to both.
 */
export default async function CustomPagesIndex() {
  const admin = await requireAdmin();

  const { data, error } = await getServiceClient()
    .from("custom_pages")
    .select("slug, data, published, updated_at")
    .order("updated_at", { ascending: false })
    .returns<Row[]>();

  const rows = (data ?? []).map((row) => {
    const parsed = customPageSchema.safeParse(row.data);
    return {
      slug: row.slug,
      published: row.published,
      updatedAt: row.updated_at,
      title: parsed.success ? parsed.data.title : row.slug,
      visibility: parsed.success ? parsed.data.visibility : "public",
      blocks: parsed.success ? parsed.data.blocks.length : 0,
      broken: !parsed.success,
    };
  });

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <h1>Your pages</h1>
        <p>
          Pages you have added yourself, built from blocks. The eight pages the
          site was designed around are edited under{" "}
          <Link href="/admin/pages">Page text</Link> — those have fixed layouts
          and cannot be added to or removed.
        </p>
      </div>

      {error && (
        <p className="admin-banner is-bad" role="alert">
          The pages could not be read: {error.message}
        </p>
      )}

      <CreatePageForm />

      {rows.length === 0 && !error && (
        <div className="admin-empty">
          No pages yet. Give one a title above and you will get somewhere to
          build it.
        </div>
      )}

      {rows.length > 0 && (
        <ul className="admin-rows">
          {rows.map((row) => (
            <li key={row.slug}>
              <Link href={`/admin/custom-pages/${row.slug}`} className="admin-row">
                <span className="admin-row-main">
                  <span className="admin-row-title">{row.title}</span>
                  <span className="admin-row-sub">
                    /{row.slug} · {row.blocks} block{row.blocks === 1 ? "" : "s"}
                    {row.broken ? " · needs attention" : ""}
                  </span>
                </span>
                <span className="admin-row-meta">
                  <span
                    className={`admin-chip is-${
                      !row.published ? "warn" : row.visibility === "unlisted" ? "info" : "good"
                    }`}
                  >
                    {!row.published
                      ? "Draft"
                      : row.visibility === "unlisted"
                        ? "Unlisted"
                        : "Live"}
                  </span>{" "}
                  {formatWhen(row.updatedAt)}
                </span>
                <span className="admin-row-go" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
