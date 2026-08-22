"use client";

import type { ObjectNode } from "@/lib/admin/field-node";
import { DocumentEditor } from "@/components/admin/DocumentEditor";
import { saveCustomPage } from "@/lib/admin/custom-page-actions";

/**
 * The form for one client-built page.
 *
 * As thin as `PageEditor` and `SiteEditor`, for the same reason: `DocumentEditor`
 * already holds every behaviour a content form needs, and the only things that
 * differ per record are which action to call and what identifies it. The blocks
 * inside are drawn by the same `SchemaFields` as everything else — a block list
 * is an array of variants, and both are now ordinary node kinds.
 *
 * The one place it cannot take the shared defaults is the wording of the save.
 * Every other document this form edits is live the moment it is saved, so
 * `DocumentEditor` says "Save and publish" and "Saved. This is live on the
 * site." A custom page is the only record with a draft state, and
 * `saveCustomPage` writes `data` and nothing else — publishing is a separate,
 * deliberate act in `CustomPageControls`. Taking the defaults told somebody
 * editing a draft that their page was live, on the button they pressed and
 * again in the confirmation, while the panel directly above it said it was a
 * draft. They believed the button.
 */
export function CustomPageEditor({
  slug,
  published,
  tree,
  initial,
  historyCount,
  updatedLabel,
  restored,
}: {
  slug: string;
  published: boolean;
  tree: ObjectNode;
  initial: Record<string, unknown>;
  historyCount: number;
  updatedLabel: string;
  restored: boolean;
}) {
  return (
    <DocumentEditor
      action={saveCustomPage}
      identity={{ slug }}
      tree={tree}
      initial={initial}
      historyHref={`/admin/custom-pages/${slug}/history`}
      historyCount={historyCount}
      updatedLabel={updatedLabel}
      restored={restored}
      saveLabel={published ? "Save and publish" : "Save draft"}
      extraMessage={() =>
        published
          ? "Saved. This is live on the site."
          : `Saved as a draft. Nothing is served at /${slug} until you publish it.`
      }
    />
  );
}
