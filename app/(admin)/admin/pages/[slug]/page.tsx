import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { pageSchemas } from "@/content/schema";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageEditor } from "@/components/admin/PageEditor";
import { PagePreview } from "@/components/admin/PagePreview";
import { requireAdmin } from "@/lib/auth";
import { readPageDocument } from "@/lib/admin/page-read";
import { getServiceClient } from "@/lib/supabase";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForPage } from "@/lib/admin/locks";
import { countRevisions } from "@/lib/admin/revisions";
import {
  PAGE_LABELS,
  PAGE_ORDER,
  PAGE_PATHS,
  formatWhen,
  isPageSlug,
} from "@/lib/admin/page-meta";
import { MARKED_UP } from "@/lib/admin/visual-map";

export const metadata: Metadata = {
  title: "Edit page | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

interface MetaRow {
  updated_at: string | null;
  admin_users: { name: string | null; email: string } | null;
}

export default async function EditPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ restored?: string }>;
}) {
  const admin = await requireAdmin();
  const { slug } = await params;
  const { restored } = await searchParams;

  if (!isPageSlug(slug)) notFound();

  /**
   * Read straight from the table, not through the cached content layer.
   *
   * The editor has to show the document it is about to overwrite. `getPage()`
   * is tagged and cached, which is right for the site and wrong here: on a
   * stale entry the client would edit a copy and save it back, quietly undoing
   * whatever the cache had not caught up with. The catalog editor already reads
   * this way for the same reason.
   *
   * Validated against the page's own schema afterwards, so what is rendered is
   * still exactly what the site would render from this row.
   */
  const stored = await readPageDocument(slug);
  if (stored === null) notFound();

  const parsed = pageSchemas[slug].safeParse(stored);
  if (!parsed.success) {
    throw new Error(
      `[admin] the stored ${slug} page does not match its schema: ` +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.map(String).join(".")}: ${i.message}`)
          .join("; ")
    );
  }
  const content = parsed.data;

  const [historyCount, meta] = await Promise.all([
    countRevisions("page", slug),
    getServiceClient()
      .from("pages")
      .select("updated_at, admin_users(name, email)")
      .eq("slug", slug)
      .maybeSingle<MetaRow>(),
  ]);

  const tree = buildFieldTree(pageSchemas[slug], locksForPage(slug));

  const showPreview = MARKED_UP.includes(slug);

  const editor = meta.data?.admin_users;
  const updatedLabel = meta.data?.updated_at
    ? `Last edited ${formatWhen(meta.data.updated_at)}` +
      (editor ? ` by ${editor.name ?? editor.email}` : "")
    : "Not edited since the site was set up";

  return (
    <AdminShell admin={admin} wide={showPreview}>
      <nav className="admin-crumbs">
        <Link href="/admin">Site content</Link>
        <span aria-hidden="true">›</span>
        <Link href="/admin/pages">Page text</Link>
        <span aria-hidden="true">›</span>
        <span>{PAGE_LABELS[slug]}</span>
      </nav>

      <div className="admin-head">
        <h1>{PAGE_LABELS[slug]}</h1>
        <p>
          Saving publishes straight to{" "}
          <a href={PAGE_PATHS[slug]} target="_blank" rel="noreferrer">
            {PAGE_PATHS[slug]}
          </a>
          . Every save is kept, so anything here can be put back the way it was.
        </p>
      </div>

      {/* Two columns where the page has been marked up for it, one where it has
          not. The preview is a shortcut into this form, so a page without
          markers simply does not get the shortcut — the form is unaffected. */}
      <div className={`admin-split${showPreview ? " has-preview" : ""}`}>
        <div className="admin-split-editor">
          <PageEditor
            slug={slug}
            tree={tree}
            initial={content as unknown as Record<string, unknown>}
            historyCount={historyCount}
            updatedLabel={updatedLabel}
            restored={restored === "1"}
          />
        </div>

        {showPreview && (
          <PagePreview
            slug={slug}
            path={PAGE_PATHS[slug]}
            label={PAGE_LABELS[slug]}
            pages={PAGE_ORDER.map((s) => ({
              slug: s,
              label: PAGE_LABELS[s],
              path: PAGE_PATHS[s],
            }))}
          />
        )}
      </div>
    </AdminShell>
  );
}
