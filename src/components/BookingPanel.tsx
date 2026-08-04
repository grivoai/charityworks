"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/content/types";

/**
 * Calendly's inline scheduling widget, shown on the contact form's success
 * state so a lead can book a call there and then.
 *
 * This is additive. The lead has already been submitted, delivered to the
 * webhook and logged by the time this renders, so nothing here can cost a
 * lead — if the embed never appears, the follow-up still happens.
 *
 * Calendly's copy-paste snippet does not work here. Their widget.js scans the
 * document for `.calendly-inline-widget` elements *as it loads*; this container
 * does not exist until after a submission, so the scan would find nothing and
 * silently do nothing. We call their documented `initInlineWidget` entry point
 * instead — the same official script, driven explicitly rather than by the
 * scan. The container deliberately does not carry Calendly's class name so a
 * late scan cannot also try to claim it.
 *
 * Loading the script here rather than in the layout means no third-party code,
 * and no Calendly cookies, for the many visitors who never submit the form.
 */

const WIDGET_SRC = "https://assets.calendly.com/assets/external/widget.js";

/**
 * When to stop waiting and show the plain link.
 *
 * Blockers usually fail the request outright, which fires onError. Some
 * resolve the host to nowhere and simply hang, which fires nothing at all —
 * this is what covers that case.
 */
const LOAD_TIMEOUT_MS = 12000;

type CalendlyApi = {
  initInlineWidget(options: {
    url: string;
    parentElement: HTMLElement;
    prefill?: { name?: string; email?: string };
    utm?: Record<string, string>;
  }): void;
};

declare global {
  interface Window {
    Calendly?: CalendlyApi;
  }
}

type LoadState = "loading" | "ready" | "failed";

export function BookingPanel({
  booking,
  name,
  email,
  leadId,
  campaign,
}: {
  booking: SiteContent["booking"];
  /** Prefilled into Calendly so the details are not typed twice. */
  name: string;
  email: string;
  /**
   * Travels to Calendly as utm_content. Calendly carries UTM parameters onto
   * the booking record and its own webhooks, so a booking can be joined to the
   * lead that produced it instead of matched on email address.
   */
  leadId: string;
  /** The lead's source, so the booking record shows where it came from. */
  campaign: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);
  const [state, setState] = useState<LoadState>("loading");

  const init = useCallback(() => {
    const parentElement = containerRef.current;
    if (!parentElement || initialised.current || !window.Calendly) return;

    initialised.current = true;
    window.Calendly.initInlineWidget({
      url: booking.url,
      parentElement,
      prefill: { name, email },
      utm: {
        utmSource: "website",
        utmMedium: "contact-form",
        ...(campaign ? { utmCampaign: campaign } : {}),
        ...(leadId ? { utmContent: leadId } : {}),
      },
    });
    setState("ready");
  }, [booking.url, name, email, leadId, campaign]);

  useEffect(() => {
    // Covers the script already being on the page: a second submission, or a
    // submission on one form after the other copy loaded it earlier in the
    // session. next/script fires onReady in that case too; the ref guard makes
    // whichever arrives second a no-op.
    init();

    const timer = setTimeout(() => {
      if (!initialised.current) setState("failed");
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [init]);

  return (
    <div className="booking" data-state={state}>
      <h3 className="booking-heading">{booking.heading}</h3>
      <p className="booking-lede">{booking.lede}</p>

      {/* Never given React children, and its className never changes. Calendly
          injects its iframe in here and owns everything below this node; a
          re-render that rewrote the class attribute would take Calendly's own
          classes with it. Hidden by CSS rather than unmounted on failure, so
          React never removes a node Calendly is holding a reference to. */}
      <div ref={containerRef} className="booking-embed" />

      <p className="booking-note">
        {state === "failed"
          ? "The calendar could not load here — this link opens it directly:"
          : "Loading the calendar…"}
      </p>

      {/* Always rendered, not just on failure: it is the backstop when the
          embed fails, and the way out for anyone who would rather book in a
          tab of their own. */}
      <a
        className="booking-fallback"
        href={booking.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {booking.fallbackLabel}
      </a>

      <Script
        src={WIDGET_SRC}
        strategy="afterInteractive"
        onReady={init}
        onError={() => setState("failed")}
      />
    </div>
  );
}
