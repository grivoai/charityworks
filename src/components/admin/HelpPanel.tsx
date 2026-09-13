"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { topicsFor, type HelpTopic } from "@/lib/admin/help";

/**
 * The help panel: a button in the bar, and a sheet that slides over the page.
 *
 * A native <dialog> opened with showModal(), which is what gives it the parts
 * a help panel has to get right and that are tedious to get right by hand —
 * focus moves in and is held there, Escape closes it, the page behind is
 * inert to the keyboard and to a screen reader — without a dependency or a
 * focus-trap of our own. Clicking the shaded backdrop closes it too: the
 * backdrop's clicks arrive with the dialog itself as their target, and
 * nothing inside the sheet does.
 *
 * The topics are chosen by the route, so the same button reads differently on
 * the catalog and on a custom page. What is TRUE OF THE CURRENT SCREEN is
 * open; everything else is a heading to expand. Every topic is always present,
 * because "how do I add a PDF?" is a question people ask from wherever they
 * happen to be, and a panel that only answers questions about this screen
 * sends them looking for the right screen to ask from.
 *
 * Nothing here interprets the help as markup. The content module holds plain
 * strings, and they land in text nodes.
 */
export function HelpPanel() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const { here, elsewhere } = topicsFor(pathname);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      {/* On a phone the word gives way to a glyph, the way the back link gives
          way to its arrow: the label is clipped rather than removed, so the
          control still announces itself as "Help". */}
      <button
        type="button"
        className="admin-signout admin-guide-toggle"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="admin-guide-glyph" aria-hidden="true">?</span>
        <span className="admin-guide-toggle-label">Help</span>
      </button>

      <dialog
        ref={dialog}
        className="admin-guide"
        aria-labelledby="admin-guide-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="admin-guide-inner">
          <div className="admin-guide-head">
            <h2 id="admin-guide-title">Help</h2>
            <button
              type="button"
              className="admin-btn admin-btn-quiet"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <p className="admin-guide-section">On this screen</p>
          {here.map((topic) => (
            <Topic key={topic.id} topic={topic} open onNavigate={() => setOpen(false)} />
          ))}

          {elsewhere.length > 0 && (
            <>
              <p className="admin-guide-section">Everything else</p>
              {elsewhere.map((topic) => (
                <Topic key={topic.id} topic={topic} onNavigate={() => setOpen(false)} />
              ))}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

function Topic({
  topic,
  open = false,
  onNavigate,
}: {
  topic: HelpTopic;
  open?: boolean;
  onNavigate: () => void;
}) {
  return (
    <details className="admin-guide-topic" open={open || undefined}>
      <summary>{topic.title}</summary>
      <div className="admin-guide-body">
        {topic.body.map((piece, index) =>
          "steps" in piece ? (
            <ol key={index}>
              {piece.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p key={index}>{piece.p}</p>
          )
        )}
        {topic.link && (
          <Link href={topic.link.href} className="admin-guide-link" onClick={onNavigate}>
            {topic.link.label} →
          </Link>
        )}
      </div>
    </details>
  );
}
