import Image from "next/image";
import Link from "next/link";
import type { AuctionItem } from "@/content/types";
import { Icon } from "@/components/Icon";

/**
 * Auction catalog grid.
 *
 * `variant="bento"` honours each item's `span` for the mixed-size catalog
 * layout; `variant="uniform"` ignores spans for the home page teaser, where a
 * partial slice of the catalog would otherwise leave holes in the grid.
 */
export function BentoGrid({
  items,
  variant = "bento",
}: {
  items: AuctionItem[];
  variant?: "bento" | "uniform";
}) {
  const uniform = variant === "uniform";

  return (
    <div className={`bento${uniform ? " bento-uniform" : ""}`}>
      {items.map((item, index) => {
        const span = uniform ? undefined : item.span;
        const spanClass =
          span === "wide" ? " b-wide" : span === "tall" ? " b-tall" : "";
        // Stagger the reveal across each row of the grid.
        const delayClass = index % 4 === 0 ? "" : ` d${index % 4}`;

        return (
          <article
            key={item.id}
            className={`bento-card${spanClass} reveal${delayClass}`}
          >
            {/* next/image, not a bare <img>: the client's source photographs
                run to several megabytes each (one is 5.2MB), which would sink
                the page speed the SEO work depends on. This generates resized,
                modern-format variants per breakpoint. */}
            <Image
              className="bento-photo"
              src={item.image.src}
              alt={item.image.alt}
              fill
              sizes="(max-width: 760px) 100vw, (max-width: 980px) 50vw, 33vw"
              style={{ objectFit: "cover" }}
            />
            <div className="bento-scrim" />
            <h3>
              {/* The link is stretched over the whole card via ::after, so the
                  tile is clickable while the accessible name stays the title
                  rather than a vague "read more". */}
              <Link
                href={`/auction-items/${item.slug}`}
                className="bento-link"
              >
                <span aria-hidden="true"><Icon name={item.icon} /></span> {item.title}
              </Link>
            </h3>
            <p className="reveal-txt">{item.blurb}</p>
            <span className="bento-cue" aria-hidden="true">
              View category →
            </span>
          </article>
        );
      })}
    </div>
  );
}
