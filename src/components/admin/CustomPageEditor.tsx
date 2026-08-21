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
 */
export function CustomPageEditor({
  slug,
  tree,
  initial,
  historyCount,
  updatedLabel,
  restored,
}: {
  slug: string;
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
    />
  );
}
