"use client";

import { useEffect, useState } from "react";

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ContactChannels } from "@/components/ContactChannels";
import type { SiteContent } from "@/content/types";
import { PREVIEW_CHANNEL, type PreviewMessage } from "@/lib/admin/preview-channel";

/**
 * The site's header and footer, driven by whatever is in the form right now.
 *
 * THIS IS THE ONE PREVIEW IN THE ADMIN THAT SHOWS UNSAVED WORK, and it is the
 * one that needs to. Saving site details publishes to every page at once —
 * there is no draft state for the site record the way there is for a page — so
 * the moment to see a wrong phone number or a broken menu label is before the
 * save, not after it.
 *
 * The draft cannot be fetched, because it does not exist anywhere but the
 * editor's own state. So it is POSTED IN: the frame is same-origin, this
 * component announces itself when it mounts, and the panel answers with the
 * form's current contents and again whenever they change. Both ends check the
 * origin, and the message carries data only — there is nothing here that acts
 * on an instruction from the other side.
 *
 * Seeded with the SAVED record, so the frame is correct before the first
 * message arrives and stays correct if none ever does.
 */

/** Enough of a shape check to refuse nonsense without re-validating the schema. */
function looksLikeSite(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.nav) &&
    typeof record.logo === "object" &&
    record.logo !== null &&
    typeof record.contact === "object" &&
    record.contact !== null &&
    typeof record.footer === "object" &&
    record.footer !== null
  );
}

export function SitePreviewFrame({ site: saved }: { site: SiteContent }) {
  const [site, setSite] = useState(saved);

  /* A save re-renders this route with new props; adopt them, or the frame would
     keep showing the draft it was last sent as though nothing had happened. */
  useEffect(() => setSite(saved), [saved]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const message = event.data as PreviewMessage | null;
      if (message?.channel !== PREVIEW_CHANNEL || message.type !== "draft") return;

      try {
        const draft: unknown = JSON.parse(message.data);
        /* Half-typed content is still valid JSON and still the right shape —
           an empty heading is an empty string, not a missing key — so this is
           a guard against a message from somewhere unexpected rather than
           against the client's typing. Anything unrecognised is ignored and
           the frame keeps showing what it had. */
        if (looksLikeSite(draft)) setSite(draft);
      } catch {
        // Not our message after all. Nothing to do but keep rendering.
      }
    };

    window.addEventListener("message", onMessage);

    /* Announce, rather than wait to be found. The panel cannot know when this
       has hydrated, and a preview that only updates from the NEXT keystroke
       would be blank-looking for as long as somebody sat still. */
    window.parent?.postMessage(
      { channel: PREVIEW_CHANNEL, type: "ready" } satisfies PreviewMessage,
      window.location.origin
    );

    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <Nav logo={site.logo} links={site.nav} cta={site.navCta} />

      <main id="main">
        {/* What sits between the header and the footer is NOT this form's
            business — every page has its own body, and picking one to show
            here would suggest the site details were somehow part of it. What
            is shown instead is the third thing this form owns: the contact
            rows, which appear on the home and contact pages and are the only
            part of this record that renders outside the chrome. */}
        <section className="pad contact site-preview-body">
          <div className="wrap">
            <div>
              <h1 className="section-title">How to reach us</h1>
              <p className="section-lede" style={{ color: "rgba(255,255,255,0.8)" }}>
                The menu above, the footer below and these rows are what this
                form sets. They are the same on every page of the site.
              </p>
            </div>
            <ContactChannels channels={site.contact.channels} reveal={false} />
          </div>
        </section>
      </main>

      <Footer site={site} />
    </>
  );
}
