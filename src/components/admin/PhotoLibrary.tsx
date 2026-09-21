"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatBytes } from "@/lib/admin/document-rules";
import { deleteImage, type DeleteImageResult } from "@/lib/admin/image-actions";
import type { LibraryEntry } from "@/lib/admin/image-usage";

/**
 * The photo library, in the browser.
 *
 * Every photograph uploaded through the admin, with where it is shown, and a
 * way to delete the ones nothing shows. That last part is why this page
 * exists: uploads only ever accumulated — a photograph tried and rejected, or
 * uploaded three times at three sizes while getting a tile right, stayed in
 * the picker forever with no way to take it out.
 *
 * Delete is the only action. Changing which photograph a page shows is done
 * on that page, and each use here links to it; when the last use is gone the
 * button appears. The server re-checks before acting, so the button being
 * shown is a courtesy rather than the rule.
 */

export interface PhotoLibraryProps {
  entries: LibraryEntry[];
}

function PhotoRow({
  entry,
  onStart,
  onDone,
}: {
  entry: LibraryEntry;
  onStart: () => void;
  onDone: (result: DeleteImageResult) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const unused = entry.usedBy.length === 0;

  return (
    <li className="admin-photo-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="admin-photo-thumb" src={entry.src} alt="" loading="lazy" />

      <span className="admin-doc-file-main">
        <span className="admin-doc-file-name">{entry.filename}</span>
        <span className="admin-doc-file-sub">
          {entry.width && entry.height ? `${entry.width}×${entry.height} · ` : ""}
          {formatBytes(entry.bytes)} · uploaded {entry.uploadedLabel}
          {entry.uploadedBy ? ` by ${entry.uploadedBy}` : ""}
        </span>
        {unused ? (
          <span className="admin-doc-file-sub admin-photo-unused">Not shown anywhere</span>
        ) : (
          <span className="admin-doc-file-sub">
            Shown on{" "}
            {entry.usedBy.map((use, index) => (
              <span key={`${use.href}-${use.label}`}>
                {index > 0 && "; "}
                <Link href={use.href}>{use.label}</Link>
              </span>
            ))}
          </span>
        )}
        {problem && <span className="admin-doc-file-problem">{problem}</span>}
      </span>

      {unused && (
        <span className="admin-doc-file-tools">
          {confirming ? (
            <>
              <span className="admin-doc-confirm">
                Gone for good. An older version of a page that used it would
                show a blank picture if restored.
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  onStart();
                  const result = await deleteImage(entry.id);
                  setBusy(false);
                  setConfirming(false);
                  if (!result.ok) return setProblem(result.message);
                  setProblem(null);
                  onDone(result);
                }}
              >
                {busy ? "Deleting…" : "Delete for good"}
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={() => setConfirming(true)}
            >
              Delete
            </button>
          )}
        </span>
      )}
    </li>
  );
}

export function PhotoLibrary({ entries }: PhotoLibraryProps) {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [onlyUnused, setOnlyUnused] = useState(false);

  const unused = entries.filter((entry) => entry.usedBy.length === 0);
  const shown = onlyUnused ? unused : entries;

  const start = () => setNote(null);
  const done = (result: DeleteImageResult) => {
    if (!result.ok) return;
    setNote(result.note);
    // The server component holds the list; re-reading it is what makes the
    // change visible, rather than a second copy of the data kept in step here.
    router.refresh();
  };

  return (
    <>
      {note && (
        <p className="admin-banner is-good" role="status">
          {note}
        </p>
      )}

      <section className="admin-doc-section">
        <h2>
          Uploaded photographs{" "}
          <span className="admin-count-inline">
            {entries.length === 0
              ? "none yet"
              : `${entries.length} · ${unused.length} not shown anywhere`}
          </span>
        </h2>

        {entries.length === 0 ? (
          <div className="admin-empty">
            Nothing uploaded yet. Photographs you upload while editing a page or
            a lot appear here. The pictures that came with the site are files,
            not uploads, so they are not listed.
          </div>
        ) : (
          <>
            <p className="admin-help">
              Newest first. A photograph that is shown somewhere links to the
              screen that shows it — change the picture there and it can be
              deleted here. Deleting is permanent.
            </p>
            <label className="admin-photo-filter">
              <input
                type="checkbox"
                checked={onlyUnused}
                onChange={(event) => setOnlyUnused(event.target.checked)}
              />{" "}
              Only photographs not shown anywhere
            </label>

            {shown.length === 0 ? (
              <div className="admin-empty">
                Every uploaded photograph is shown somewhere on the site.
              </div>
            ) : (
              <ul className="admin-doc-files">
                {shown.map((entry) => (
                  <PhotoRow key={entry.id} entry={entry} onStart={start} onDone={done} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
