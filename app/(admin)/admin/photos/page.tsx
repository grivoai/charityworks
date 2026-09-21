import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { PhotoLibrary } from "@/components/admin/PhotoLibrary";
import { requireAdmin } from "@/lib/auth";
import { listLibrary } from "@/lib/admin/image-usage";

export const metadata: Metadata = {
  title: "Photographs | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * The photo library.
 *
 * Read uncached, like every other admin list: the client has just uploaded
 * or just deleted something, and a cached copy is how that appears not to
 * have happened. The list and the usage scan behind it are a few dozen rows.
 */
export default async function PhotosRoute() {
  const admin = await requireAdmin();
  const { entries, error } = await listLibrary();

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <h1>Photographs</h1>
        <p>
          Every photograph uploaded through this admin, and where each one is
          shown. Uploading happens on the page or lot that will show the
          picture; this is where to see what has built up and delete what is
          no longer needed.
        </p>
      </div>

      {error && (
        <p className="admin-banner is-bad" role="alert">
          The library could not be read: {error}
        </p>
      )}

      <PhotoLibrary entries={entries} />
    </AdminShell>
  );
}
