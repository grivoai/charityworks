import Link from "next/link";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import {
  DocumentLibrary,
  type DocumentFileView,
  type DocumentLinkView,
} from "@/components/admin/DocumentLibrary";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { formatWhen } from "@/lib/admin/page-meta";
import { DOCUMENT_BUCKET } from "@/lib/admin/uploads";

export const metadata: Metadata = {
  title: "Documents | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

interface UploadRow {
  id: string;
  filename: string;
  bytes: number;
  created_at: string;
  admin_users: { name: string | null; email: string } | null;
}

interface LinkRow {
  slug: string;
  title: string;
  updated_at: string;
  upload_id: string;
}

export default async function DocumentsRoute() {
  const admin = await requireAdmin();
  const supabase = getServiceClient();

  /**
   * Read uncached, like every other admin list.
   *
   * `getDocument()` exists for the public side and is wrapped in a tagged
   * cache; showing the client a cached copy of what they are about to edit is
   * how an edit appears not to have happened.
   */
  const [linkResult, uploadResult] = await Promise.all([
    supabase
      .from("document_links")
      .select("slug, title, updated_at, upload_id")
      .order("updated_at", { ascending: false })
      .returns<LinkRow[]>(),
    supabase
      .from("uploads")
      .select("id, filename, bytes, created_at, admin_users(name, email)")
      .eq("bucket", DOCUMENT_BUCKET)
      .order("created_at", { ascending: false })
      .returns<UploadRow[]>(),
  ]);

  const error = linkResult.error ?? uploadResult.error;
  const linkRows = linkResult.data ?? [];
  const uploadRows = uploadResult.data ?? [];

  /** Which addresses point at each file — the reason a file can or cannot be deleted. */
  const usedBy = new Map<string, string[]>();
  for (const link of linkRows) {
    usedBy.set(link.upload_id, [...(usedBy.get(link.upload_id) ?? []), link.slug]);
  }

  const files: DocumentFileView[] = uploadRows.map((row) => ({
    id: row.id,
    filename: row.filename,
    bytes: row.bytes,
    uploadedLabel: formatWhen(row.created_at),
    uploadedBy: row.admin_users?.name ?? row.admin_users?.email ?? null,
    usedBy: usedBy.get(row.id) ?? [],
  }));

  const byId = new Map(files.map((file) => [file.id, file]));

  const links: DocumentLinkView[] = linkRows.map((row) => ({
    slug: row.slug,
    title: row.title,
    updatedLabel: formatWhen(row.updated_at),
    file: byId.get(row.upload_id) ?? null,
  }));

  return (
    <AdminShell admin={admin}>

      <div className="admin-head">
        <h1>Documents</h1>
        <p>
          PDFs with an address you can give out. The address belongs to the
          document, not to the file behind it — replace the file next quarter and
          every copy of the link that has already gone out starts showing the new
          one.
        </p>
      </div>

      {error && (
        <p className="admin-banner is-bad" role="alert">
          The documents could not be read: {error.message}
        </p>
      )}

      <DocumentLibrary links={links} files={files} />
    </AdminShell>
  );
}
