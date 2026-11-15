"use client";

import { useEffect, useState } from "react";

import type { HiddenPageMap, HiddenPageSlug } from "@/content/hidden-pages";
import { GuitarPricesBody } from "@/components/hidden-pages/GuitarPricesBody";
import { TravelVoucherBody } from "@/components/hidden-pages/TravelVoucherBody";
import { VoucherTermsBody } from "@/components/hidden-pages/VoucherTermsBody";
import { PREVIEW_CHANNEL, type PreviewMessage } from "@/lib/admin/preview-channel";

type AnyHiddenPage = HiddenPageMap[HiddenPageSlug];

/**
 * A hidden page's body, driven by whatever is in the form right now.
 *
 * The same protocol as SitePreviewFrame: seeded with the SAVED document so it
 * is right before any message arrives, then announces itself, and the panel
 * posts the form's JSON whenever it changes. Rendered with the page's own
 * body component, so the preview is the page's real markup.
 */

/** Enough of a shape check to refuse a stray message without re-validating. */
function looksLike(value: unknown, slug: HiddenPageSlug): value is AnyHiddenPage {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  if (r.slug !== slug) return false;
  switch (slug) {
    case "guitar-prices":
      return (
        Array.isArray(r.guitars) &&
        Array.isArray(r.sections) &&
        Array.isArray(r.paragraphs) &&
        Array.isArray(r.closingParagraphs) &&
        typeof r.verify === "object" &&
        typeof r.closing === "object" &&
        typeof r.booking === "object"
      );
    case "travel-voucher":
      return (
        Array.isArray(r.steps) &&
        Array.isArray(r.explanation) &&
        Array.isArray(r.faqs) &&
        typeof r.booking === "object"
      );
    case "voucher-terms":
      return (
        Array.isArray(r.terms) &&
        typeof r.dining === "object" &&
        typeof r.booking === "object"
      );
  }
}

export function HiddenPagePreviewFrame({
  saved,
  guideHref,
}: {
  saved: AnyHiddenPage;
  guideHref: string | null;
}) {
  const [page, setPage] = useState<AnyHiddenPage>(saved);

  /* A save re-renders this route with new props; adopt them. */
  useEffect(() => setPage(saved), [saved]);

  /* Show every scroll-reveal element at once. The site fades sections in as
     they scroll into view, but the observer only knows the elements that were
     there on load: a guitar added or moved in the form mounts a new row,
     which would stay invisible. Preview only; the public page is untouched. */
  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>(".reveal:not(.in)")
      .forEach((el) => el.classList.add("reveal-instant", "in"));
  }, [page]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data as PreviewMessage | null;
      if (message?.channel !== PREVIEW_CHANNEL || message.type !== "draft") return;
      try {
        const draft: unknown = JSON.parse(message.data);
        if (looksLike(draft, saved.slug)) setPage(draft);
      } catch {
        // Not our message. Keep showing what we had.
      }
    };

    window.addEventListener("message", onMessage);
    window.parent?.postMessage(
      { channel: PREVIEW_CHANNEL, type: "ready" } satisfies PreviewMessage,
      window.location.origin
    );
    return () => window.removeEventListener("message", onMessage);
  }, [saved.slug]);

  switch (page.slug) {
    case "guitar-prices":
      return <GuitarPricesBody page={page} guideHref={guideHref} />;
    case "travel-voucher":
      return <TravelVoucherBody page={page} />;
    case "voucher-terms":
      return <VoucherTermsBody page={page} />;
  }
}
