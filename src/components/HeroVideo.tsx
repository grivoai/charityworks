"use client";

import { useCallback, useRef, useState } from "react";

import { at, editable } from "@/lib/editable";
import { isAllowedEmbed } from "@/lib/embeds";

/**
 * The walkthrough video, as a control in the hero rather than a player in it.
 *
 * WHY A DIALOG AND NOT AN EMBED. The hero is the first paint. An iframe here
 * loads a third-party player before the headline is done arriving, costs a
 * connection to drive.google.com on every visit including the ones that never
 * watch anything, and takes enough vertical space to push the tile stack off
 * the fold. The control costs a button.
 *
 * THE IFRAME IS MOUNTED ONLY WHILE OPEN, which is doing two jobs. Nothing is
 * requested until somebody asks for it, and — the part that is easy to miss —
 * closing the dialog unmounts the frame, which is the only reliable way to stop
 * playback. A `<dialog>` that is merely closed keeps its subtree alive, so a
 * hidden player carries on talking over the page. There is no cross-origin
 * pause to call here; removing the frame is the pause.
 *
 * Native `<dialog>` + `showModal()` rather than a hand-built overlay: it makes
 * the rest of the page inert, traps focus, closes on Escape, restores focus to
 * the button afterwards, and gives us `::backdrop`. Every one of those is a
 * thing hand-rolled modals get wrong.
 *
 * `onClose` is what drives state back to closed, not the close handlers. Escape
 * and the backdrop-click both close the dialog without going through them, and
 * a component that only cleared its state in `onClick` would leave `open` true
 * after Escape — the frame still mounted, still playing, invisible.
 */
export function HeroVideo({
  heading,
  lede,
  embedUrl,
  linkLabel,
  path,
}: {
  heading: string;
  lede?: string;
  embedUrl: string;
  linkLabel: string;
  /** Where this block sits in the page document — `"hero.video"` on the home page. */
  path?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const openDialog = useCallback(() => {
    setOpen(true);
    dialogRef.current?.showModal();
  }, []);

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  /* A modal dialog fills its own top layer, so a click anywhere outside the
     panel still lands on the <dialog> element itself. Comparing against
     currentTarget is what separates "clicked the backdrop" from "clicked
     something inside the panel", without an extra overlay element. */
  const onBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === event.currentTarget) closeDialog();
    },
    [closeDialog]
  );

  /* Checked on save by the schema and again here. Same reasoning as the FAQ
     page's player: the schema is what runs when somebody uses the admin, this
     is what runs when the document arrives by any other route — a migration
     script, a restored revision — and an iframe src is not a field to be
     trusting about. A refused URL renders no control at all rather than a
     button that opens a broken frame.

     Below the hooks, not above them: an early return before `useCallback` would
     make the hook order depend on the URL. */
  if (!isAllowedEmbed(embedUrl)) return null;

  return (
    <>
      <button type="button" className="hero-video-btn" onClick={openDialog}>
        <span className="hero-video-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" focusable="false">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
          </svg>
        </span>
        <span {...editable(at(path, "linkLabel"))}>{linkLabel}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="video-dialog"
        onClose={() => setOpen(false)}
        onClick={onBackdropClick}
        aria-labelledby="hero-video-heading"
      >
        <div className="video-dialog-panel">
          <div className="video-dialog-head">
            <div>
              <h2 id="hero-video-heading" {...editable(at(path, "heading"))}>
                {heading}
              </h2>
              {lede && (
                <p className="video-dialog-lede" {...editable(at(path, "lede"))}>
                  {lede}
                </p>
              )}
            </div>
            <button
              type="button"
              className="video-dialog-close"
              onClick={closeDialog}
              aria-label="Close the video"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          {/* `title` is the frame's accessible name — without it a screen reader
              announces "frame" and nothing else. No `loading="lazy"`: by the
              time this mounts the visitor has asked for it. */}
          <div className="video-dialog-frame">
            {open && (
              <iframe
                src={embedUrl}
                title={heading}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
