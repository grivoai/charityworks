"use client";

import { useId, useState } from "react";
import { at, editable } from "@/lib/editable";

/**
 * An auctioneer's bio, collapsed to its first paragraph on a phone.
 *
 * The roster is ten profiles and each carries three or four paragraphs, which
 * measured at ~563px of prose per auctioneer — a little over half of the
 * 10,817px roster. Collapsing turns the page from something you scroll past
 * into something you can scan, without any auctioneer losing a word of what
 * they say about themselves.
 *
 * EVERY PARAGRAPH IS ALWAYS RENDERED. The collapse is `max-height: 0` on the
 * paragraphs after the first, exactly as FaqAccordion collapses a closed
 * answer, and for the same reason given there: the text stays in the DOM so
 * search engines index it whatever its open state. Truncating the array
 * instead — rendering `bio[0]` and appending the rest on click — would be
 * simpler and would quietly cost the site ten auctioneer bios' worth of
 * indexable copy, which on a page that exists to rank for auctioneers is the
 * wrong trade.
 *
 * It also keeps the admin honest: `editable()` marks every paragraph, so all
 * of them stay clickable in the preview rather than only the visible one.
 *
 * Collapsing is mobile-only and lives entirely in the media query — this
 * component renders identical markup at every width, so there is no hydration
 * mismatch and nothing to measure. Above 760px the button is `display: none`
 * (and therefore not focusable) and the paragraphs are never clipped.
 */
export function AuctioneerBio({
  bio,
  who,
  name,
}: {
  bio: string[];
  /** Document path of this auctioneer, e.g. `"auctioneers.3"`. */
  who: string;
  /** Named in the button's accessible label — ten identical "Read more"
      buttons tell a screen reader user nothing about which one they are on. */
  name: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  const paragraphs = (
    <div className={`auc-bio${expanded ? " expanded" : ""}`} id={id}>
      {bio.map((para, i) => (
        <p key={i} {...editable(at(who, "bio", i))}>
          {para}
        </p>
      ))}
    </div>
  );

  // One paragraph is already as short as it gets; a toggle there would expand
  // to exactly what is on screen.
  if (bio.length < 2) return paragraphs;

  return (
    <>
      {paragraphs}
      <button
        type="button"
        className="auc-bio-toggle"
        aria-expanded={expanded}
        aria-controls={id}
        aria-label={
          expanded
            ? `Show less about ${name}`
            : `Read more about ${name}`
        }
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Show less" : "Read more"}
        <span aria-hidden="true"> {expanded ? "↑" : "↓"}</span>
      </button>
    </>
  );
}
