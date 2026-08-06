"use client";

import { useCallback, useRef, useState } from "react";
import type { FaqItem } from "@/content/types";
import { at, editable } from "@/lib/editable";

/**
 * Single-open accordion.
 *
 * Answers stay in the DOM (height-collapsed rather than unmounted) so search
 * engines index every answer regardless of open state. The open panel's
 * max-height is measured from its own scrollHeight, matching the original
 * script, so the 0.5s reveal lands exactly on the content height.
 */
export function FaqAccordion({
  faqs,
  path,
}: {
  faqs: FaqItem[];
  /**
   * Where this list sits in the page document — `"faqs"`. The component is
   * handed a slice and cannot know that, so the prefix comes from the caller
   * and the per-entry paths are built from it.
   */
  path?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const panels = useRef(new Map<string, HTMLDivElement | null>());

  const registerPanel = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      panels.current.set(id, el);
    },
    []
  );

  const maxHeightFor = (id: string) => {
    if (openId !== id) return undefined;
    const el = panels.current.get(id);
    return { maxHeight: el ? `${el.scrollHeight}px` : "none" };
  };

  return (
    <div className="faq-list">
      {faqs.map((faq, index) => {
        const open = openId === faq.id;
        // Position, not id: the editor addresses list entries by index, and the
        // preview has to speak the same language for a click to find the input.
        const entry = at(path, index);
        return (
          // className must stay a constant string. This element carries
          // `.reveal`, and RevealObserver adds its `in` class imperatively via
          // classList — React has no record of it, so the moment a
          // state-dependent class is interpolated here React rewrites the whole
          // attribute on open/close and `in` is destroyed, leaving the item at
          // opacity 0 and translateY(38px). The open state is expressed by the
          // button's aria-expanded, which globals.css styles the icon from.
          <div key={faq.id} className="faq-item reveal">
            <h3>
              <button
                type="button"
                className="faq-q"
                aria-expanded={open}
                aria-controls={`${faq.id}-answer`}
                id={`${faq.id}-question`}
                onClick={() => setOpenId(open ? null : faq.id)}
                {...editable(at(entry, "question"))}
              >
                {faq.question}
                <span className="faq-icon" aria-hidden="true" />
              </button>
            </h3>
            <div
              className="faq-a"
              id={`${faq.id}-answer`}
              role="region"
              aria-labelledby={`${faq.id}-question`}
              ref={registerPanel(faq.id)}
              style={maxHeightFor(faq.id)}
            >
              {/* The paragraph, not the panel around it: `.faq-a` is the
                  animation container, and its box while opening is a moving
                  target rather than the shape of the text. Either way this is
                  only reachable once the answer is open — a closed panel is
                  `max-height: 0; overflow: hidden`, which clips hit-testing
                  along with the paint. */}
              <p {...editable(at(entry, "answer"))}>{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
