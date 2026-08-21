import type { Metadata } from "next";

import { siteContentSchema } from "@/content/schema";
import { AdminShell } from "@/components/admin/AdminShell";
import { SiteEditor } from "@/components/admin/SiteEditor";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForSite } from "@/lib/admin/locks";
import { getNavDestinations, withNavDestinations } from "@/lib/admin/nav-destinations";
import { countRevisions } from "@/lib/admin/revisions";
import { formatWhen } from "@/lib/admin/page-meta";
import { readSiteDocument, SITE_ENTITY_ID, SITE_ROW_ID } from "@/lib/admin/site-read";

export const metadata: Metadata = {
  title: "Site details | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

/** Reads the session cookie, so it is per-request by definition. */
export const dynamic = "force-dynamic";

interface MetaRow {
  updated_at: string | null;
  admin_users: { name: string | null; email: string } | null;
}

/**
 * The site settings editor.
 *
 * The one content record that had no way to edit it. Everything on this page —
 * the wordmark, the navigation labels, the phone number and email addresses,
 * the booking link, the footer headings — renders on every route, which is why
 * saving here revalidates the whole site rather than one path.
 */
export default async function SiteSettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ restored?: string }>;
}) {
  const admin = await requireAdmin();
  const { restored } = await searchParams;

  // Straight from the table rather than through `getSite()`, which is cached
  // for the public site. See readSiteDocument.
  const stored = await readSiteDocument();
  if (stored === null) {
    throw new Error(
      "[admin] the site_settings row is missing. Run `npm run seed` to create it."
    );
  }

  const parsed = siteContentSchema.safeParse(stored);
  if (!parsed.success) {
    throw new Error(
      "[admin] the stored site settings do not match the schema: " +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.map(String).join(".")}: ${i.message}`)
          .join("; ")
    );
  }

  const [historyCount, meta] = await Promise.all([
    countRevisions("site", SITE_ENTITY_ID),
    getServiceClient()
      .from("site_settings")
      .select("updated_at, admin_users(name, email)")
      .eq("id", SITE_ROW_ID)
      .maybeSingle<MetaRow>(),
  ]);

  // The nav's destinations are not knowable from the schema — they depend on
  // which pages exist right now — so the picker is injected after the tree is
  // built. The save re-derives the same set and checks what comes back.
  const tree = withNavDestinations(
    buildFieldTree(siteContentSchema, locksForSite()),
    await getNavDestinations()
  );

  const editor = meta.data?.admin_users;
  const updatedLabel = meta.data?.updated_at
    ? `Last edited ${formatWhen(meta.data.updated_at)}` +
      (editor ? ` by ${editor.name ?? editor.email}` : "")
    : "Not edited since the site was set up";

  return (
    <AdminShell admin={admin}>

      <div className="admin-head">
        <h1>Site details</h1>
        <p>
          The parts that are the same on every page: the name in the header, the
          navigation, your phone number and email addresses, the booking link
          and the footer. Saving updates the whole site, not one page. Every
          save is kept, so anything here can be put back the way it was.
        </p>
      </div>

      <SiteEditor
        tree={tree}
        initial={parsed.data as unknown as Record<string, unknown>}
        historyCount={historyCount}
        updatedLabel={updatedLabel}
        restored={restored === "1"}
      />
    </AdminShell>
  );
}
