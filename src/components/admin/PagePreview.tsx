"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { FIELD_PATH_ATTR, MARK_ATTR } from "@/lib/admin/dom";
import { PREVIEW_CHANNEL, type PreviewMessage } from "@/lib/admin/preview-channel";

/**
 * The live page, beside the form that edits it.
 *
 * This is a locator, not a second editor. Hovering shows what is editable,
 * clicking scrolls the form to that field and focuses it, and everything after
 * that happens in the form exactly as it always did. No content is written from
 * here, which is why none of the saving, validation, locking or version history
 * needed changing to support it.
 *
 * Two boundaries are worth stating plainly, because they are what keep this
 * cheap:
 *
 *   - The site's own DOM is only ever READ. The iframe is same-origin, so the
 *     listeners live here and reach into it; the highlight is drawn on this
 *     side, over the frame. Nothing is injected into the page, so no script is
 *     added to the public site and there is nothing for React to fight over.
 *
 *   - The form is found through the DOM, not through props. A click resolves a
 *     path to `[data-cw-path]` and focuses what is inside. The two columns
 *     share no state and neither renders the other, so deleting this file would
 *     leave the editor exactly as it was.
 */

export interface PreviewPage {
  slug: string;
  label: string;
  path: string;
  /**
   * Where this record is edited.
   *
   * Carried rather than assumed: the preview column now serves the catalog
   * editor as well as the pages editor, and a category is edited at
   * /admin/catalog/<slug>. Building the link from a prefix here would send a
   * click to a page that does not exist.
   */
  editorHref: string;
}

interface Outline {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
}

/**
 * The frame is rendered at a real viewport width and scaled down to fit, not
 * squeezed into whatever space the column has.
 *
 * A 730px-wide column would otherwise show the site's tablet layout — the
 * hamburger menu, the stacked grids — and the client would be editing one page
 * while looking at a version of it almost none of their visitors see. Scaling
 * costs one multiplication in each direction and is worth it for that.
 */
type DeviceName = "desktop" | "tablet" | "largePhone" | "phone";

/**
 * The widths worth checking, not every width that exists.
 *
 * Each one sits just inside a breakpoint the stylesheet actually changes at,
 * because a preset that renders the same layout as its neighbour teaches the
 * client nothing and costs them a click to discover that. 834 is an iPad in
 * portrait, 430 the largest phone in common use, 390 a mainstream one — and
 * the phone pair straddle the 428px boundary where the hero and the card
 * grids reflow.
 *
 * `narrow` drives the centring of the stage: anything phone-width is centred
 * in the column rather than pinned left, where it reads as a mistake.
 */
const DEVICES: Record<DeviceName, { label: string; width: number; narrow?: true }> = {
  desktop: { label: "Desktop", width: 1280 },
  tablet: { label: "Tablet", width: 834 },
  largePhone: { label: "Large phone", width: 430, narrow: true },
  phone: { label: "Phone", width: 390, narrow: true },
};

/** How long a click here suppresses the focus handler's scroll-back. */
const ECHO_GUARD_MS = 700;

/** Reading `location` across the frame is cheap; a click through to another page is not. */
const LOCATION_POLL_MS = 400;

/** Fast enough to read as live while typing, slow enough to be free. */
const DRAFT_POLL_MS = 250;

function rectOf(el: Element): Outline | null {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  // An element an ancestor has clipped away still reports a full-size box.
  // Outlining it would draw a rectangle around nothing — most visibly when a
  // FAQ answer is selected and then its accordion is closed again.
  if (isClipped(el)) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height, label: "" };
}

/**
 * Whether an ancestor has clipped this element out of sight.
 *
 * A collapsed FAQ answer is `max-height: 0; overflow: hidden`, so the paragraph
 * inside it still reports a full-height box that is not on screen. Drawing an
 * outline there would put a rectangle around nothing, in the wrong place.
 */
function isClipped(el: Element): boolean {
  const r = el.getBoundingClientRect();
  let parent = el.parentElement;

  while (parent) {
    const style = parent.ownerDocument.defaultView?.getComputedStyle(parent);
    if (style && style.overflow !== "visible") {
      const p = parent.getBoundingClientRect();
      const outside =
        r.bottom <= p.top + 1 ||
        r.top >= p.bottom - 1 ||
        r.right <= p.left + 1 ||
        r.left >= p.right - 1;
      if (outside) return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * The nearest ancestor that is actually on screen.
 *
 * Focusing the input for a FAQ answer while its accordion is shut has to point
 * at something. The paragraph is clipped, and the panel around it is real but
 * zero pixels tall — outlining that draws a hairline. Walking up to the first
 * box with actual size lands on the FAQ item, which is the honest answer to
 * "where is this on the page": inside that question.
 */
function visibleAnchor(el: Element): Element {
  let current: Element | null = el;
  while (current) {
    const r = current.getBoundingClientRect();
    if (r.height > 1 && r.width > 1 && !isClipped(current)) return current;
    current = current.parentElement;
  }
  return el;
}

export function PagePreview({
  slug,
  path,
  label,
  pages,
  canPointAndEdit = true,
  liveDraft = false,
}: {
  slug: string;
  /** The public route this page renders at, e.g. `/faqs`. */
  path: string;
  label: string;
  /** Every page, so a click on borrowed content can offer the right editor. */
  pages: PreviewPage[];
  /**
   * Whether clicking the page can find the field that sets it.
   *
   * True for the eight built-in pages, whose markup carries `data-cw` markers
   * that `check:visual` keeps in step with the schema. False for a client-built
   * page: `PageBlocks` has no markers, so "Point & edit" would put a
   * transparent sheet over the frame and swallow every click without ever
   * finding a field — a control that looks like it does something and does
   * nothing. When false the mode toggle is not offered at all and the frame
   * stays browsable.
   */
  canPointAndEdit?: boolean;
  /**
   * Whether the frame is fed the form's unsaved contents as they are typed.
   *
   * False everywhere except the site editor, and that is not caution — it is
   * what the frame can do with them. A page preview loads a route that renders
   * a stored document; handing it a draft would mean re-rendering the page in
   * the browser from admin state, which is a second renderer to keep in step
   * with the real one. The site's chrome is small enough to render from props,
   * so `/admin/site/preview` does, and it is also the only record here that
   * publishes the instant it is saved — the one place seeing the change first
   * is worth the machinery.
   */
  liveDraft?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<"edit" | "browse">(
    canPointAndEdit ? "edit" : "browse"
  );
  const [device, setDevice] = useState<DeviceName>("desktop");
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [hover, setHover] = useState<Outline | null>(null);
  const [selected, setSelected] = useState<Outline | null>(null);
  const [notice, setNotice] = useState<React.ReactNode>(null);
  const [dirty, setDirty] = useState(false);
  const [elsewhere, setElsewhere] = useState<string | null>(null);

  /**
   * Where the frame has been, and where in that it currently is.
   *
   * KEPT HERE RATHER THAN READ FROM THE FRAME, and that is a safety property
   * rather than a preference. An iframe's navigations join the TOP-LEVEL
   * session history, so `contentWindow.history.back()` on a frame that has not
   * navigated walks the ADMIN page backwards instead — out of the editor,
   * taking any unsaved work with it. `history.length` cannot tell those apart,
   * because it counts the whole joint history.
   *
   * Observing the frame's own navigations is the only thing that can: Back is
   * offered only when this trail proves there is somewhere inside the frame to
   * go back to, so the dangerous case is unreachable rather than merely
   * unlikely.
   */
  const [trail, setTrail] = useState<{ path: string[]; at: number }>({
    path: [path],
    at: 0,
  });

  /* The elements currently outlined, so scrolling can re-measure them. */
  const hoverEl = useRef<Element | null>(null);
  const selectedEl = useRef<Element | null>(null);
  const echoGuard = useRef(0);
  const savedSnapshot = useRef<string | null>(null);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  /* Read inside event handlers, which must not be rebuilt when it changes. */
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const doc = () => frameRef.current?.contentDocument ?? null;

  /**
   * The frame may already have finished loading before this component hydrates.
   *
   * `onLoad` is a React prop, so it is only attached once the client bundle has
   * run. A statically served page inside the frame can finish before that, and
   * then the load event has already been and gone — leaving `ready` false, no
   * listeners on the sheet, and a preview that highlights nothing. It looks
   * exactly like a broken feature and depends on timing, so it appears and
   * disappears with how fast the page happens to render.
   *
   * Found when tagged caching made the frame load faster than hydration. The
   * race was always there; the cache only made it reliable.
   */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      if (frame.contentDocument?.readyState === "complete") setReady(true);
    } catch {
      // Cross-origin, which cannot happen for our own routes — but a thrown
      // error here would take the whole panel down, and a preview that cannot
      // be pointed at is still better than an admin page that will not render.
    }
  }, [reloadKey]);

  /* Fit the chosen viewport width into whatever the column actually has. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const available = stage.clientWidth;
      // Never enlarged: a phone shown at 200% would be its own kind of lie.
      setScale(Math.min(1, available / DEVICES[device].width));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [device, collapsed]);

  /* ---------------------------------------------------------------- */
  /* Measuring                                                         */
  /* ---------------------------------------------------------------- */

  const remeasure = useCallback(() => {
    const k = scaleRef.current;

    /* Two coordinate spaces meet here. An element's box is in the frame's own
       pixels; the outline is positioned inside the stage, in the admin's. So:
       scale, then shift by wherever the frame sits within the stage — which is
       not always its top-left corner, since a phone-width frame is centred. */
    const stageRect = stageRef.current?.getBoundingClientRect();
    const frameRect = frameRef.current?.getBoundingClientRect();
    const offsetX = stageRect && frameRect ? frameRect.left - stageRect.left : 0;
    const offsetY = stageRect && frameRect ? frameRect.top - stageRect.top : 0;

    const outlineFor = (el: Element | null): Outline | null => {
      if (!el || !el.isConnected) return null;
      const r = rectOf(el);
      if (!r) return null;
      return {
        top: r.top * k + offsetY,
        left: r.left * k + offsetX,
        width: r.width * k,
        height: r.height * k,
        label: (el.getAttribute(MARK_ATTR) ?? "").split(":").pop() ?? "",
      };
    };

    setHover(outlineFor(hoverEl.current));
    setSelected(outlineFor(selectedEl.current));
  }, []);

  /* ---------------------------------------------------------------- */
  /* Clicking a marked element                                         */
  /* ---------------------------------------------------------------- */

  const openField = useCallback(
    (mark: string) => {
      const colon = mark.indexOf(":");
      const record = colon === -1 ? null : mark.slice(0, colon);
      const fieldPath = colon === -1 ? mark : mark.slice(colon + 1);

      /* Content borrowed from another page's record — the home page renders its
         enquiry form from the contact page. Editing it here would be editing a
         field this form does not have. */
      if (record && record !== slug) {
        const other = pages.find((p) => p.slug === record);
        setNotice(
          other ? (
            <>
              That text is part of <strong>{other.label}</strong>, which is where
              it is edited — it appears on this page too.{" "}
              <Link href={other.editorHref}>Open {other.label}</Link>
            </>
          ) : (
            <>That text is set on another page.</>
          )
        );
        return;
      }

      const wrapper = document.querySelector(
        `[${FIELD_PATH_ATTR}="${CSS.escape(fieldPath)}"]`
      );

      if (!wrapper) {
        // The form is derived from the schema, so a marker with no field means
        // the two have drifted. check:visual exists to stop that reaching here.
        setNotice(
          <>This text does not have an input in the form ({fieldPath}).</>
        );
        return;
      }

      const input = wrapper.querySelector<HTMLElement>(
        "input:not([type=hidden]), textarea, select"
      );

      echoGuard.current = Date.now();
      wrapper.scrollIntoView({ block: "center", behavior: "smooth" });
      wrapper.classList.remove("is-found");
      // Reading offsetWidth restarts the animation when the same field is
      // clicked twice; without it the second click looks like nothing happened.
      void (wrapper as HTMLElement).offsetWidth;
      wrapper.classList.add("is-found");

      if (input && !(input as HTMLInputElement).disabled) {
        input.focus({ preventScroll: true });
        setNotice(null);
      } else if (input) {
        /* Locked. The reason is already rendered under the field by the form —
           read it from there rather than keeping a second copy of the rule. */
        const reason = wrapper.querySelector(".admin-help-lock")?.textContent;
        setNotice(
          <>
            <strong>This one is fixed.</strong> {reason ?? "It cannot be edited here."}
          </>
        );
      }
    },
    [pages, slug]
  );

  /* ---------------------------------------------------------------- */
  /* Listening to the frame                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!ready) return;
    const d = doc();
    const win = frameRef.current?.contentWindow;
    if (!d || !win) return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = win.requestAnimationFrame(() => {
        frame = 0;
        remeasure();
      });
    };

    win.addEventListener("scroll", schedule, true);
    win.addEventListener("resize", schedule);

    /* Transitions move things after the event that started them: the reveal
       animation, and the accordion opening. Re-measure when they settle. */
    d.addEventListener("transitionend", schedule, true);

    return () => {
      if (frame) win.cancelAnimationFrame(frame);
      d.removeEventListener("transitionend", schedule, true);
      win.removeEventListener("scroll", schedule, true);
      win.removeEventListener("resize", schedule);
    };
  }, [ready, remeasure]);

  /* ---------------------------------------------------------------- */
  /* Taking the pointer, in edit mode                                  */
  /* ---------------------------------------------------------------- */

  /**
   * In edit mode a transparent sheet sits over the frame and takes every
   * pointer event; what reaches the page is decided here, one case at a time.
   *
   * The blunt version of this — listening inside the frame and cancelling
   * link clicks — does not work, and it is worth recording why so nobody
   * spends the afternoon on it again. Next's router does not navigate from the
   * anchor's default action, so `preventDefault()` does not stop it; it
   * navigates from a listener registered during hydration, ahead of anything
   * added later, so `stopPropagation()` does not reach it either. Cancelling
   * at the Navigation API instead leaves the URL saying `/faqs` while React
   * has already rendered the contact page into the frame — a preview that
   * lies about what it is showing, which is worse than the problem.
   *
   * Taking the input before it arrives is the only version that does not
   * depend on framework internals. It also makes the rule explicit rather
   * than emergent: buttons are forwarded, because a collapsed FAQ answer
   * cannot be pointed at until its accordion opens; links never are.
   */
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!ready || mode !== "edit" || !sheet) return;

    const hit = (event: MouseEvent): Element | null => {
      const d = doc();
      const frameEl = frameRef.current;
      if (!d || !frameEl) return null;
      // Measured from the frame, not the stage: the two differ whenever the
      // frame is narrower than the column and sits centred inside it.
      const r = frameEl.getBoundingClientRect();
      const k = scaleRef.current;
      return d.elementFromPoint(
        (event.clientX - r.left) / k,
        (event.clientY - r.top) / k
      );
    };

    const onMove = (event: MouseEvent) => {
      const el = hit(event);
      hoverEl.current = el?.closest(`[${MARK_ATTR}]`) ?? null;
      remeasure();
    };

    const onLeave = () => {
      hoverEl.current = null;
      remeasure();
    };

    const onClick = (event: MouseEvent) => {
      const el = hit(event);
      if (!el) return;

      /* The page's own controls still work — but never a link, and never a
         control that is itself inside one. */
      const control = el.closest("button, summary, [role='button']");
      if (control && !control.closest("a[href]")) {
        (control as HTMLElement).click();
      }

      const marked = el.closest(`[${MARK_ATTR}]`);
      if (!marked) return;

      selectedEl.current = marked;
      remeasure();
      openField(marked.getAttribute(MARK_ATTR) ?? "");
    };

    /* Scrolling has to be handed on by hand, since the sheet swallows it.
       Not passive: without preventDefault the admin page behind scrolls
       instead, which is the one thing more disorienting than not scrolling. */
    const onWheel = (event: WheelEvent) => {
      const win = frameRef.current?.contentWindow;
      if (!win) return;
      event.preventDefault();
      const k = scaleRef.current;
      // Divided by the scale so a wheel notch moves the page the same distance
      // on screen whichever width is being previewed.
      win.scrollBy({
        left: event.deltaX / k,
        top: event.deltaY / k,
        behavior: "instant",
      });
    };

    sheet.addEventListener("mousemove", onMove);
    sheet.addEventListener("mouseleave", onLeave);
    sheet.addEventListener("click", onClick);
    sheet.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      sheet.removeEventListener("mousemove", onMove);
      sheet.removeEventListener("mouseleave", onLeave);
      sheet.removeEventListener("click", onClick);
      sheet.removeEventListener("wheel", onWheel);
    };
  }, [ready, mode, remeasure, openField]);

  /* The parent scrolling moves the frame under the outline too. */
  useEffect(() => {
    if (!ready) return;
    const onParent = () => remeasure();
    window.addEventListener("scroll", onParent, true);
    window.addEventListener("resize", onParent);
    return () => {
      window.removeEventListener("scroll", onParent, true);
      window.removeEventListener("resize", onParent);
    };
  }, [ready, remeasure]);

  /* ---------------------------------------------------------------- */
  /* Following the frame if it is navigated                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!ready) return;
    // Site navigation is client-side, so `load` does not fire a second time.
    // Without this the frame could be showing /contact while every click is
    // interpreted against the FAQs document.
    const timer = window.setInterval(() => {
      let here: string | null = null;
      try {
        here = frameRef.current?.contentWindow?.location.pathname ?? null;
      } catch {
        here = null; // navigated off-origin; treat as elsewhere
      }
      setElsewhere(here && here !== path ? here : null);

      /* The same poll keeps the trail, so there is one place that decides where
         the frame is. Which way it moved is worked out by comparison rather
         than by a flag set when the buttons are pressed: a flag has to be
         cleared on a timeout, and gets it wrong exactly when a navigation is
         slow — which is when somebody is most likely to press again. */
      if (here === null) return;
      setTrail((current) => {
        if (here === current.path[current.at]) return current;
        if (current.at > 0 && here === current.path[current.at - 1]) {
          return { ...current, at: current.at - 1 };
        }
        if (here === current.path[current.at + 1]) {
          return { ...current, at: current.at + 1 };
        }
        // Somewhere new: whatever was ahead is no longer reachable, exactly as
        // a browser drops its forward entries when you navigate off a back.
        return {
          path: [...current.path.slice(0, current.at + 1), here],
          at: current.at + 1,
        };
      });
    }, LOCATION_POLL_MS);
    return () => window.clearInterval(timer);
  }, [ready, path]);

  /* A reload remounts the frame under a new key, so it is a new browsing
     context with a history of its own. The trail has to start again with it. */
  useEffect(() => {
    setTrail({ path: [path], at: 0 });
  }, [reloadKey, path]);

  /* ---------------------------------------------------------------- */
  /* Staying honest about what the frame is showing                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    /* The frame shows the page as saved. While there are unsaved edits it is
       out of date by definition, and saying so is better than letting the
       client wonder why their new wording has not appeared. */
    const input = document.querySelector<HTMLInputElement>(
      'form.admin-form input[name="data"]'
    );
    if (!input) return;

    savedSnapshot.current = input.value;
    const check = () => setDirty(input.value !== savedSnapshot.current);

    const observer = new MutationObserver(check);
    observer.observe(input, { attributes: true, attributeFilter: ["value"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    /* A save publishes; the frame has to be re-fetched to show it. Announced by
       the editor rather than guessed at, so this cannot reload on a save that
       was refused. */
    const onSaved = (event: Event) => {
      // The document as stored, carried on the event: the hidden input still
      // holds the pre-save render at the moment this fires.
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") savedSnapshot.current = detail;
      setDirty(false);
      selectedEl.current = null;
      hoverEl.current = null;
      setReloadKey((n) => n + 1);
    };
    window.addEventListener("cw:saved", onSaved);
    return () => window.removeEventListener("cw:saved", onSaved);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Sending the draft into the frame                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!liveDraft) return;

    const input = document.querySelector<HTMLInputElement>(
      'form.admin-form input[name="data"]'
    );
    if (!input) return;

    let sent: string | null = null;

    const post = (force = false) => {
      const win = frameRef.current?.contentWindow;
      if (!win) return;
      if (!force && input.value === sent) return;
      sent = input.value;
      win.postMessage(
        { channel: PREVIEW_CHANNEL, type: "draft", data: input.value } satisfies PreviewMessage,
        window.location.origin
      );
    };

    /* Polled rather than observed. The value of a hidden input is written by
       React as a property, and whether that also lands as an ATTRIBUTE — which
       is the only thing a MutationObserver can watch — is an implementation
       detail of the renderer rather than a guarantee. A quarter-second poll
       reading `input.value` is a handful of string comparisons and cannot be
       wrong about it. */
    const timer = window.setInterval(() => post(), DRAFT_POLL_MS);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data as PreviewMessage | null;
      if (message?.channel !== PREVIEW_CHANNEL || message.type !== "ready") return;
      // The frame has just hydrated, and may have missed everything so far.
      post(true);
    };
    window.addEventListener("message", onMessage);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [liveDraft, reloadKey]);

  /* ---------------------------------------------------------------- */
  /* The other direction: focus a field, find it on the page           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!ready) return;

    const onFocus = (event: FocusEvent) => {
      // The click handler already put this field on screen; scrolling the frame
      // back to it would yank the page around under the cursor.
      if (Date.now() - echoGuard.current < ECHO_GUARD_MS) return;

      const wrapper = (event.target as Element | null)?.closest?.(
        `[${FIELD_PATH_ATTR}]`
      );
      const fieldPath = wrapper?.getAttribute(FIELD_PATH_ATTR);
      if (!fieldPath) return;

      const d = doc();
      const el = d?.querySelector(`[${MARK_ATTR}="${CSS.escape(fieldPath)}"]`);
      if (!el) return;

      const anchor = visibleAnchor(el);
      anchor.scrollIntoView({ block: "center", behavior: "smooth" });
      selectedEl.current = anchor;
      // After the smooth scroll has settled, or the outline is measured from
      // where the element used to be.
      window.setTimeout(remeasure, 320);
    };

    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [ready, remeasure]);

  /* ---------------------------------------------------------------- */

  if (collapsed) {
    return (
      <aside className="admin-preview is-collapsed">
        <button
          type="button"
          className="admin-btn admin-btn-quiet"
          onClick={() => setCollapsed(false)}
        >
          Show the page
        </button>
      </aside>
    );
  }

  return (
    <aside className="admin-preview">
      <div className="admin-preview-bar">
        <span className="admin-preview-title">{label}</span>

        {canPointAndEdit && (
        <div className="admin-seg" role="group" aria-label="What clicking does">
          <button
            type="button"
            className={mode === "edit" ? "is-on" : ""}
            onClick={() => setMode("edit")}
            aria-pressed={mode === "edit"}
          >
            Point &amp; edit
          </button>
          <button
            type="button"
            className={mode === "browse" ? "is-on" : ""}
            onClick={() => {
              setMode("browse");
              hoverEl.current = null;
              remeasure();
            }}
            aria-pressed={mode === "browse"}
          >
            Browse
          </button>
        </div>
        )}

        <div className="admin-seg" role="group" aria-label="Preview width">
          {(Object.keys(DEVICES) as DeviceName[]).map((name) => (
            <button
              key={name}
              type="button"
              className={device === name ? "is-on" : ""}
              onClick={() => {
                setDevice(name);
                hoverEl.current = null;
                selectedEl.current = null;
                remeasure();
              }}
              aria-pressed={device === name}
            >
              {DEVICES[name].label}
            </button>
          ))}
        </div>

        {/* Only ever enabled when the trail says the frame itself has somewhere
            to go — see the note on `trail`. */}
        <div className="admin-seg is-icons" role="group" aria-label="Page history">
          <button
            type="button"
            onClick={() => frameRef.current?.contentWindow?.history.back()}
            disabled={trail.at === 0}
            title="Back"
            aria-label="Back"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => frameRef.current?.contentWindow?.history.forward()}
            disabled={trail.at >= trail.path.length - 1}
            title="Forward"
            aria-label="Forward"
          >
            →
          </button>
        </div>

        <button
          type="button"
          className="admin-btn admin-btn-quiet"
          onClick={() => setReloadKey((n) => n + 1)}
          title="Reload the page"
        >
          Refresh
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-quiet"
          onClick={() => setCollapsed(true)}
        >
          Hide
        </button>
      </div>

      {elsewhere && (
        <p className="admin-preview-note is-warn">
          Showing <code>{elsewhere}</code>, which this form does not edit.{" "}
          <button
            type="button"
            className="admin-linkish"
            onClick={() => setReloadKey((n) => n + 1)}
          >
            Back to {path}
          </button>
        </p>
      )}

      {!elsewhere && dirty && (
        <p className="admin-preview-note">
          {liveDraft
            ? "This is how your unsaved changes will look. Nothing is live until you save."
            : "This is the saved page. Your unsaved edits will appear here once you save."}
        </p>
      )}

      {notice && (
        <p className="admin-preview-note is-info" role="status">
          {notice}
        </p>
      )}

      <div
        className={`admin-preview-stage${DEVICES[device].narrow ? " is-narrow" : ""}`}
        ref={stageRef}
      >
        <iframe
          key={reloadKey}
          ref={frameRef}
          src={reloadKey === 0 ? path : `${path}?preview=${reloadKey}`}
          title={`${label} — live page`}
          style={{
            width: DEVICES[device].width,
            // Undo the scale so the frame still fills the stage vertically,
            // otherwise a scaled-down page leaves a band of empty stage below.
            height: `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
          }}
          onLoad={() => {
            hoverEl.current = null;
            selectedEl.current = null;
            setReady(false);
            // A fresh document means fresh listeners.
            window.setTimeout(() => setReady(true), 0);
          }}
        />

        {/* The sheet that takes the pointer. Above the frame, below the
            outlines — which must not intercept the very hover that placed
            them, or they would flicker themselves away. */}
        {mode === "edit" && <div className="admin-preview-sheet" ref={sheetRef} />}

        {mode === "edit" && selected && (
          <div
            className="admin-outline is-selected"
            style={{
              top: selected.top,
              left: selected.left,
              width: selected.width,
              height: selected.height,
            }}
          />
        )}

        {mode === "edit" && hover && (
          <div
            className="admin-outline"
            style={{
              top: hover.top,
              left: hover.left,
              width: hover.width,
              height: hover.height,
            }}
          >
            <span className="admin-outline-tag">{hover.label}</span>
          </div>
        )}
      </div>

      <p className="admin-preview-foot">
        {liveDraft
          ? "The header, footer and contact rows, updating as you type. Every page on the site carries these."
          : !canPointAndEdit
            ? "The page as it will look. Change the wording in the form beside it."
            : mode === "edit"
              ? "Click anything highlighted to jump to its field. Scroll here as usual; links stay put."
              : "The page behaves normally — use this to click through to another one."}
      </p>
    </aside>
  );
}
