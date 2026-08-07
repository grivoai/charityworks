"use client";

import { savePage, type SaveState } from "@/lib/admin/page-actions";
import type { ObjectNode } from "@/lib/admin/field-node";
import { DocumentEditor } from "@/components/admin/DocumentEditor";

/**
 * The page editor: a document editor pointed at `savePage`.
 *
 * Everything that used to live here now lives in `DocumentEditor`, because the
 * catalog needs the same frame. Kept as its own component rather than inlined
 * at the route so the two things a page editor knows — which action saves it,
 * and where its history lives — stay in one place.
 */
export function PageEditor({
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
      action={savePage}
      identity={{ slug }}
      tree={tree}
      initial={initial}
      historyHref={`/admin/pages/${slug}/history`}
      historyCount={historyCount}
      updatedLabel={updatedLabel}
      restored={restored}
    />
  );
}
