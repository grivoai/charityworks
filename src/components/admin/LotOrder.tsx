"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveLotOrder, type LotOrderState } from "@/lib/admin/catalog-actions";
import { useStrayDropGuard } from "@/components/admin/drop-guard";

/**
 * The running order of a category's lots, rearranged here and saved here.
 *
 * The edit form can already do this — it holds every lot and saves the
 * category whole — but one lot expanded in that form is around sixteen hundred
 * pixels tall, so two lots are never on screen together and dragging one past
 * another is not something a mouse can do. This page is the short version of
 * the same list: a row each, a handle to drag, two arrows for the keyboard,
 * and one Save.
 *
 * It writes through `saveLotOrder`, which accepts a permutation of the ids it
 * already has and nothing else — see the note there. So this component can
 * move lots and cannot edit them, which is what keeps the form the one place a
 * lot is written.
 */

export interface LotRow {
  id: string;
  name: string;
  /** Enough description to tell two similar lots apart. */
  excerpt: string;
  image: string | null;
  affordable: boolean;
}

export interface LotSection {
  id: string;
  title: string;
  lots: LotRow[];
}

/** Where a row is: which section, and how far down it. */
interface Spot {
  section: string;
  index: number;
}

const idsOf = (sections: LotSection[]) =>
  JSON.stringify(sections.map((section) => section.lots.map((lot) => lot.id)));

function SaveBar({
  dirty,
  status,
  tone,
  onReset,
}: {
  dirty: boolean;
  status: string;
  tone: "idle" | "good" | "bad";
  onReset: () => void;
}) {
  // The form's own pending state, so the bar cannot disagree with the request
  // that is actually in flight.
  const { pending } = useFormStatus();

  return (
    <div className="admin-savebar">
      {/* Announced, because the arrows are the keyboard path through this list
          and a keyboard user never sees the rows move. */}
      <span
        className={`admin-status is-${pending ? "busy" : tone}`}
        role="status"
        aria-live="polite"
      >
        {pending ? "Saving…" : status}
      </span>

      {dirty && !pending && (
        <button type="button" className="admin-btn admin-btn-quiet" onClick={onReset}>
          Discard the new order
        </button>
      )}

      <button
        type="submit"
        className="admin-btn admin-btn-primary"
        disabled={pending || !dirty}
      >
        {pending ? "Saving…" : "Save the new order"}
      </button>
    </div>
  );
}

export function LotOrder({
  slug,
  sections: stored,
  sectioned,
  editHref,
}: {
  slug: string;
  sections: LotSection[];
  /** Whether to name the sections, or just call the one list "Lots". */
  sectioned: boolean;
  editHref: string;
}) {
  /**
   * A photograph let go over this page would otherwise navigate the tab to the
   * JPEG and take the unsaved order with it. There is no upload zone here, so
   * the guard refuses every drop — except the row drags below, which stop
   * before they reach it.
   */
  useStrayDropGuard();

  const [sections, setSections] = useState(stored);
  const [baseline, setBaseline] = useState(stored);
  const [state, formAction] = useActionState<LotOrderState, FormData>(saveLotOrder, {});
  const appliedSave = useRef<string | undefined>(undefined);

  /** Set when a lot was clicked with the order unsaved; cleared by either answer. */
  const [held, setHeld] = useState(false);

  const [armed, setArmed] = useState<Spot | null>(null);
  const [drag, setDrag] = useState<Spot | null>(null);
  const [over, setOver] = useState<Spot | null>(null);

  const dirty = useMemo(
    () => idsOf(sections) !== idsOf(baseline),
    [sections, baseline]
  );

  /**
   * After a save, adopt the order the server says it stored.
   *
   * Rebasing onto the response rather than onto what is on screen matters
   * because the arrows keep working while the request is in flight: taking the
   * current list as the new baseline would mark a move made during the save as
   * already saved.
   */
  useEffect(() => {
    if (!state.ok || !state.savedAt || state.savedAt === appliedSave.current) return;
    appliedSave.current = state.savedAt;
    setHeld(false);

    const document_ = state.data as
      | { groups?: { id: string; items?: { id: string }[] }[] }
      | undefined;
    const groups = document_?.groups;
    if (groups) {
      setBaseline((previous) =>
        previous.map((section) => {
          const group = groups.find((candidate) => candidate.id === section.id);
          if (!group?.items) return section;
          const byId = new Map(section.lots.map((lot) => [lot.id, lot]));
          const lots = group.items
            .map((item) => byId.get(item.id))
            .filter((lot): lot is LotRow => Boolean(lot));
          return lots.length === section.lots.length ? { ...section, lots } : section;
        })
      );
    }

    /**
     * Tell the preview column that what it is showing has been published and
     * should be re-fetched. The same event the document editor dispatches, for
     * the same reason: neither column renders the other, and it is announced
     * only from here — where a save is known to have succeeded — so a refused
     * save cannot reload the frame and make it look as though something went
     * live.
     */
    window.dispatchEvent(
      new CustomEvent("cw:saved", { detail: JSON.stringify(state.data) })
    );
  }, [state]);

  /** An unsaved order should not be lost to a stray back button or closed tab. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /**
   * Lifts one lot out of its section and puts it back at `to`.
   *
   * Insertion rather than a swap, so a drag across several rows shifts the ones
   * it passes by one instead of flinging the row it landed on to the far end.
   * The arrows move by one, where the two are the same thing.
   *
   * Within one section only. Sections are separate ordered lists in the
   * database, so carrying a lot into another one would be changing which
   * section it belongs to — an edit, not a reorder, and the form's job.
   */
  const moveTo = (section: string, from: number, to: number) => {
    setSections((previous) =>
      previous.map((candidate) => {
        if (candidate.id !== section) return candidate;
        if (from === to) return candidate;
        const n = candidate.lots.length;
        if (from < 0 || to < 0 || from >= n || to >= n) return candidate;
        const lots = [...candidate.lots];
        const [held_] = lots.splice(from, 1);
        lots.splice(to, 0, held_);
        return { ...candidate, lots };
      })
    );
    setHeld(false);
  };

  const endDrag = () => {
    setArmed(null);
    setDrag(null);
    setOver(null);
  };

  const order = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(
          sections.map((section) => [section.id, section.lots.map((lot) => lot.id)])
        )
      ),
    [sections]
  );

  let status = "Drag a lot by its handle, or use the arrows.";
  let tone: "idle" | "good" | "bad" = "idle";
  if (state.message) {
    status = state.message;
    tone = "bad";
  } else if (dirty) {
    status = "Unsaved changes to the order";
    tone = "idle";
  } else if (state.unchanged) {
    status = "Nothing had changed.";
    tone = "good";
  } else if (state.ok) {
    status = "Saved. The new order is live on the site.";
    tone = "good";
  }

  return (
    <form action={formAction} className="admin-order-form">
      <input type="hidden" name="slug" value={slug} />
      {/* The whole order, in one field — the same shape the action validates. */}
      <input type="hidden" name="order" value={order} />

      {state.warning && <p className="admin-banner is-warn">{state.warning}</p>}

      {state.message && (
        <p className="admin-banner is-bad" role="alert">
          {state.message}
        </p>
      )}

      {held && (
        <p className="admin-banner is-warn" role="alert">
          The new order has not been saved yet. Save it or discard it below, and
          then open the lot.
        </p>
      )}

      {sections.map((section, s) =>
        section.lots.length === 0 ? null : (
          <section key={section.id}>
            <h2 className="admin-lot-group">
              {sectioned ? section.title || `Section ${s + 1}` : "Lots"}
              <span className="admin-count-inline">{section.lots.length}</span>
            </h2>

            <ul className="admin-rows admin-rows-ordered">
              {section.lots.map((lot, index) => {
                const here = { section: section.id, index };
                const isDragging = drag?.section === section.id && drag.index === index;
                const isTarget =
                  drag?.section === section.id &&
                  drag.index !== index &&
                  over?.section === section.id &&
                  over.index === index;

                return (
                  <li
                    key={lot.id}
                    className={[
                      "admin-order-row",
                      isDragging ? "is-dragging" : "",
                      isTarget ? "is-drop-target" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    draggable={armed?.section === section.id && armed.index === index}
                    onDragStart={(event) => {
                      setDrag(here);
                      event.dataTransfer.effectAllowed = "move";
                      // Firefox will not start a drag with nothing on the transfer.
                      event.dataTransfer.setData("text/plain", lot.id);
                    }}
                    /* Stopped from bubbling, and only for a row being dragged
                       inside this section: the window guard above refuses every
                       other drop, and a `dragover` it has set to "none" is one
                       the browser never follows with a `drop`. A photograph
                       dragged over these rows is not a row drag, so it returns
                       below and stays the guard's to refuse. */
                    onDragOver={(event) => {
                      if (!drag || drag.section !== section.id) return;
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "move";
                      if (over?.section !== section.id || over.index !== index) {
                        setOver(here);
                      }
                    }}
                    onDrop={(event) => {
                      if (!drag || drag.section !== section.id) return;
                      event.preventDefault();
                      event.stopPropagation();
                      moveTo(section.id, drag.index, index);
                      endDrag();
                    }}
                    onDragEnd={endDrag}
                  >
                    <div className="admin-row admin-lot-row">
                      {/* Pointer-only and hidden from assistive technology, as
                          in the form: the arrows beside it are the keyboard
                          path, and announcing a control that cannot be operated
                          without a pointer is worse than silence. */}
                      <span
                        className="admin-drag"
                        title="Drag to reorder"
                        aria-hidden="true"
                        onPointerDown={() => setArmed(here)}
                        onPointerUp={() => setArmed(null)}
                      >
                        ⠿
                      </span>

                      {/* The link is not the whole row any more, because the
                          row now holds buttons — and a button inside an anchor
                          is both invalid and a navigation waiting to happen.
                          `draggable={false}` on it and on the photograph stops
                          either from starting a drag of its own that would
                          carry a URL instead of the row. */}
                      <Link
                        href={`${editHref}?lot=${encodeURIComponent(lot.id)}`}
                        className="admin-order-open"
                        draggable={false}
                        onClick={(event) => {
                          if (!dirty) return;
                          event.preventDefault();
                          setHeld(true);
                        }}
                      >
                        {lot.image ? (
                          <img
                            className="admin-lot-thumb"
                            src={lot.image}
                            alt=""
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <span className="admin-lot-thumb is-empty">No photo</span>
                        )}
                        <span className="admin-row-main">
                          <span className="admin-row-title">
                            {lot.name}
                            {lot.affordable ? (
                              <>
                                {" "}
                                <span
                                  className="admin-lot-star"
                                  title="Marked as one of the more affordable lots"
                                >
                                  ★
                                </span>
                              </>
                            ) : null}
                          </span>
                          {lot.excerpt ? (
                            <span className="admin-row-sub">{lot.excerpt}</span>
                          ) : null}
                        </span>
                        <span className="admin-row-go" aria-hidden="true">
                          ›
                        </span>
                      </Link>

                      <div className="admin-item-tools">
                        <span className="admin-order-place" aria-hidden="true">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          className="admin-icon"
                          title="Move up"
                          aria-label={`Move ${lot.name} up`}
                          disabled={index === 0}
                          onClick={() => moveTo(section.id, index, index - 1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="admin-icon"
                          title="Move down"
                          aria-label={`Move ${lot.name} down`}
                          disabled={index === section.lots.length - 1}
                          onClick={() => moveTo(section.id, index, index + 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )
      )}

      <SaveBar
        dirty={dirty}
        status={status}
        tone={tone}
        onReset={() => {
          setSections(baseline);
          setHeld(false);
        }}
      />
    </form>
  );
}
