"use client";

import { useEffect } from "react";

import { FIELD_PATH_ATTR } from "@/lib/admin/dom";

/**
 * Lands the category form on the lot picked from the list page.
 *
 * The form still holds every lot — it saves the category whole, and the
 * history records it whole — so this does not narrow it, only puts the right
 * entry on screen: scrolled to the middle, flashed with the same halo the
 * preview uses for a field it found, and the cursor in its Name.
 *
 * `path` is the Name field's, because only fields carry a path marker; the
 * entry around it is found from there.
 */
export function LotFocus({ path }: { path: string }) {
  useEffect(() => {
    const field = document.querySelector<HTMLElement>(
      `[${FIELD_PATH_ATTR}="${CSS.escape(path)}"]`
    );
    if (!field) return;

    const entry = field.closest<HTMLElement>(".admin-item") ?? field;
    entry.scrollIntoView({ block: "start", behavior: "auto" });
    entry.classList.add("is-found");

    const input = field.querySelector<HTMLElement>("input:not([type=hidden]), textarea");
    input?.focus({ preventScroll: true });
  }, [path]);

  return null;
}
