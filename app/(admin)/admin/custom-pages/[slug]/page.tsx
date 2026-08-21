import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { customPageSchema } from "@/content/schema";
import { AdminShell } from "@/components/admin/AdminShell";
import { CustomPageEditor } from "@/components/admin/CustomPageEditor";
import { CustomPageControls } from "@/components/admin/CustomPageControls";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { COMMON_LOCKS } from "@/lib/admin/locks";
import { countRevisions } from "@/lib/admin/revisions";
import { formatWhen } from "@/lib/admin/page-meta";

export const metadata: Metadata = {
  title: "Edit page | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

interface Row {
  slug: string;
  data: unknown;
  published: boolean;
  updated_at: string | null;
  admin_users: { name: string | null; email: string } | null;
}

/**
 * Editing one client-built page.
 *
 * The lock set is duplicated from `custom-page-actions.ts` rather than imported:
 * that module is `"use server"` and may only export async functions, so a plain
 * array inside it is unreachable from here. The save is the half that enforces
 * them — this half only decides what to draw — but they have to describe the
 * same rules or the form would offer an input the save would ignore.
 */
const LOCKS = [
  ...COMMON_LOCKS,
  {
    pattern: "slug",
    mode: "readonly" as const,
    reason:
      "The page's address. Fixed once the page exists, because anyone who " +
      "already has the link would lose it — use Rename if you need to change it.",
  },
];

export default async function EditCustomPageRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ restored?: string }>;
}) {
  const admin = await requireAdmin();
  const { slug } = await params;
  const { restored } = await searchParams;

  // Straight from the table, not through the cached reader: an editor has to
  // show the document it is about to overwrite.
  const { data, error } = await getServiceClient()
    .from("custom_pages")
    .select("slug, data, published, updated_at, admin_users(name, email)")
    .eq("slug", slug)
    .maybeSingle<Row>();

  if (error) throw new Error(`[admin] could not read the page: ${error.message}`);
  if (!data) notFound();

  const parsed = customPageSchema.safeParse(data.data);
  if (!parsed.success) {
    throw new Error(
      `[admin] the stored page "${slug}" does not match the schema: ` +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.map(String).join(".")}: ${i.message}`)
          .join("; ")
    );
  }

  const historyCount = await countRevisions("custom-page", slug);
  const tree = buildFieldTree(customPageSchema, LOCKS);

  const editor = data.admin_users;
  const updatedLabel = data.updated_at
    ? `Last edited ${formatWhen(data.updated_at)}` +
      (editor ? ` by ${editor.name ?? editor.email}` : "")
    : "Not edited yet";

  return (
    <AdminShell admin={admin}>
      <nav className="admin-crumbs">
        <Link href="/admin/custom-pages">Your pages</Link>
        <span aria-hidden="true">›</span>
        <span>{parsed.data.title}</span>
      </nav>

      <div className="admin-head">
        <h1>{parsed.data.title}</h1>
        <p>
          Add blocks to build the page. Every save is kept, so anything here can
          be put back the way it was.
        </p>
      </div>

      <CustomPageControls
        slug={slug}
        published={data.published}
        visibility={parsed.data.visibility}
      />

      <CustomPageEditor
        slug={slug}
        tree={tree}
        initial={parsed.data as unknown as Record<string, unknown>}
        historyCount={historyCount}
        updatedLabel={updatedLabel}
        restored={restored === "1"}
      />
    </AdminShell>
  );
}
