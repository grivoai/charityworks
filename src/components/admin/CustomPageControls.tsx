"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteCustomPage,
  setPublished,
  type LifecycleState,
} from "@/lib/admin/custom-page-actions";

function Submit({ label, busy, className }: { label: string; busy: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? busy : label}
    </button>
  );
}

/**
 * Publish state and deletion, kept apart from the content form.
 *
 * Deliberately not inside `DocumentEditor`. That form is about wording and has
 * a dirty-state machine of its own; publishing and deleting are single acts
 * with immediate effect, and putting them behind the same Save button would
 * mean an unsaved draft could be published, or a page deleted as a side effect
 * of a typo being corrected.
 *
 * `inNav` is passed in rather than inferred from `visibility`, because the two
 * are not the same fact and reading one off the other was wrong. Publishing a
 * page with `visibility: "public"` makes it ELIGIBLE for the menu — it starts
 * appearing as an option in the nav picker under Site details — but somebody
 * still has to add it. This panel used to say "Listed in the site's menu" on
 * the strength of `visibility` alone, which was untrue for every page nobody
 * had added yet, i.e. every newly published page.
 */
export function CustomPageControls({
  slug,
  published,
  visibility,
  inNav,
}: {
  slug: string;
  published: boolean;
  visibility: "public" | "unlisted";
  inNav: boolean;
}) {
  const [pubState, pubAction] = useActionState<LifecycleState, FormData>(setPublished, {});
  const [delState, delAction] = useActionState<LifecycleState, FormData>(deleteCustomPage, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="admin-panel">
      <h2 className="admin-panel-title">This page</h2>

      {pubState.message && (
        <p className="admin-banner is-bad" role="alert">{pubState.message}</p>
      )}

      <p className="admin-help">
        {published ? (
          <>
            Live at <a href={`/${slug}`} target="_blank" rel="noreferrer">/{slug}</a>.{" "}
            {visibility === "unlisted" ? (
              "Unlisted: it is not in the menu and search engines are told to ignore it, but anyone with the link can open it. It is not private."
            ) : inNav ? (
              "In the site's menu, and in the sitemap."
            ) : (
              <>
                In the sitemap, but not in the menu — add a link to it under{" "}
                <a href="/admin/site">Site details</a> if you want one there.
              </>
            )}
          </>
        ) : (
          "A draft. Nothing is served at this address until you publish it."
        )}
      </p>

      <form action={pubAction}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="published" value={published ? "false" : "true"} />
        <Submit
          label={published ? "Unpublish" : "Publish"}
          busy="Working…"
          className={`admin-btn${published ? "" : " is-primary"}`}
        />
      </form>

      <hr className="admin-rule" />

      {delState.message && (
        <p className="admin-banner is-bad" role="alert">{delState.message}</p>
      )}

      {confirming ? (
        <form action={delAction} className="admin-confirm">
          <input type="hidden" name="slug" value={slug} />
          <label htmlFor="confirm-slug">
            This cannot be undone. Type <code>{slug}</code> to delete the page.
          </label>
          <input id="confirm-slug" name="confirm" autoComplete="off" />
          <div className="admin-confirm-actions">
            <Submit label="Delete this page" busy="Deleting…" className="admin-btn is-danger" />
            <button type="button" className="admin-linkbtn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="admin-btn is-danger" onClick={() => setConfirming(true)}>
          Delete this page
        </button>
      )}
    </section>
  );
}
