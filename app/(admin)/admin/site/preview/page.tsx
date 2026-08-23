import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { readSiteDocument } from "@/lib/admin/site-read";
import { siteContentSchema } from "@/content/schema";
import { SitePreviewFrame } from "@/components/admin/SitePreviewFrame";

/**
 * The site's chrome, previewed while it is being edited.
 *
 * WHY A ROUTE AND NOT A CORNER OF THE EDITOR: the header and footer are the
 * site's, styled by the site's stylesheet and laid out against a full viewport
 * — a fixed nav rendered inside the admin panel would sit over the admin's own
 * bar. The frame is the isolation, exactly as it is for the pages editor.
 *
 * It reads the row directly rather than through `getSite()`, for the same
 * reason every editor does: that reader is cached for the public site, and a
 * preview of a cached copy is a preview of what somebody else already saw.
 *
 * Everything unsaved arrives by `postMessage` from the panel — see
 * SitePreviewFrame. This half only has to be right before the first message.
 */

export const metadata: Metadata = {
  title: "Preview | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function SitePreviewRoute() {
  await requireAdmin();

  const stored = await readSiteDocument();
  if (stored === null) {
    throw new Error(
      "[admin] the site_settings row is missing. Run `npm run seed` to create it."
    );
  }

  const parsed = siteContentSchema.safeParse(stored);
  /* The editor beside this frame reads the same row and reports the drift in
     detail, which is where it belongs. Throwing the same error twice would
     put a stack trace inside the preview column and bury the readable one. */
  if (!parsed.success) {
    throw new Error(
      "[admin] the stored site settings do not match the schema — the editor " +
        "beside this preview says which field."
    );
  }

  return <SitePreviewFrame site={parsed.data} />;
}
