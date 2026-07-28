"use client";

import { useCallback, useRef, useState } from "react";
import type { FaqItem } from "@/content/types";

/**
 * Single-open accordion.
 *
 * Answers stay in the DOM (height-collapsed rather than unmounted) so search
 * engines index every answer regardless of open state. The open panel's
 * max-height is measured from its own scrollHeight, matching the original
 * script, so the 0.5s reveal lands exactly on the content height.
 */
export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
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
      {faqs.map((faq) => {
        const open = openId === faq.id;
        return (
          <div key={faq.id} className={`faq-item reveal${open ? " open" : ""}`}>
            <h3>
              <button
                type="button"
                className="faq-q"
                aria-expanded={open}
                aria-controls={`${faq.id}-answer`}
                id={`${faq.id}-question`}
                onClick={() => setOpenId(open ? null : faq.id)}
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
              <p>{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
