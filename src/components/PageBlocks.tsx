import Image from "next/image";

import type { ColumnItem, PageBlock } from "@/content/schema";
import {
  shadeBlocks,
  type LaidBlock,
  type Shade,
} from "@/content/block-shades";
import type { AuctionItem, ContactPage, SiteContent } from "@/content/types";
import { Cta } from "@/components/Section";
import { BentoGrid } from "@/components/BentoGrid";
import { ContactForm } from "@/components/ContactForm";
import { FaqAccordion } from "@/components/FaqAccordion";
import { TestimonialCard } from "@/components/TestimonialCard";
import { isAllowedEmbed } from "@/lib/embeds";

/**
 * Renders a client-built page's blocks.
 *
 * Every block maps onto a component the site already has, which is the whole
 * reason the block list is short: a block type is not free, it is a promise
 * that some arrangement of content will look right on a page nobody has
 * designed. Six that reuse proven components beats twenty that need new ones.
 *
 * Blocks that need site-wide data — the enquiry form's questions, the catalog's
 * categories — take it as props rather than reading it here. This component is
 * rendered inside a route that has already fetched both, and reading them again
 * per block would mean one round trip per block on a page that might have six.
 */

/** Blank lines start a new paragraph, which is the only formatting on offer. */
function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Text is rendered as text, never as markup.
 *
 * The body fields are plain strings written by an admin and shown on a public
 * page. Rendering them through `dangerouslySetInnerHTML` would turn the page
 * editor into a way to put arbitrary script on the site — a smaller risk here
 * than on a public form, since only two people can reach the editor, but not
 * one worth taking for the sake of bold text. If formatting is wanted later it
 * needs a constrained subset and a sanitiser, and that is a deliberate piece of
 * work rather than a switch to flip.
 */
function Prose({ body }: { body: string }) {
  return (
    <>
      {paragraphs(body).map((text, index) => (
        <p key={index}>{text}</p>
      ))}
    </>
  );
}

/**
 * Two letters for a person with no photograph. The auctioneers page stores
 * its initials as content; a team card derives them, because a form asking
 * for initials beside a name is a form asking the same question twice.
 */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * A block's heading and lede, centred or not as the block's `align` says.
 * Three of the grid blocks open the same way and the questions block did it
 * inline; one definition keeps them from drifting apart by a class name.
 */
function BlockHead({
  heading,
  lede,
  centred,
}: {
  heading?: string;
  lede?: string;
  centred: boolean;
}) {
  if (!heading && !lede) return null;
  return (
    <div className={centred ? "center block-head" : "block-head"}>
      {heading && <h2 className="section-title">{heading}</h2>}
      {lede && <p className="section-lede">{lede}</p>}
    </div>
  );
}

/**
 * One piece inside a column.
 *
 * Headings here are h3, under the block's h2, under the page's h1. A column is
 * a subdivision of a section rather than a section of its own, and the outline
 * a screen reader announces should say so.
 */
function ColumnPiece({ item }: { item: ColumnItem }) {
  switch (item.type) {
    case "text":
      return (
        <div className="block-column-text">
          {item.heading && <h3 className="column-title">{item.heading}</h3>}
          <div className="block-prose">
            <Prose body={item.body} />
          </div>
        </div>
      );

    case "image":
      return (
        <div className="block-column-media">
          <Image
            src={item.image.src}
            alt={item.image.alt}
            width={item.image.width ?? 800}
            height={item.image.height ?? 600}
            sizes="(max-width: 860px) 100vw, 33vw"
          />
        </div>
      );

    case "button":
      return (
        <div className="block-column-cta">
          <Cta cta={item.cta} />
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

type Width = "narrow" | "contained" | "full";
type Spacing = "tight" | "normal" | "loose";

/**
 * Each layout value maps to classes that already exist or have been written
 * for it. Nothing here composes a style from a number, which is what keeps the
 * set of reachable pages the same as the set of designed ones.
 */
const WIDTH: Record<Width, string> = {
  narrow: "wrap wrap-narrow",
  contained: "wrap",
  full: "wrap wrap-full",
};

const SPACING: Record<Spacing, string> = {
  tight: "pad pad-tight",
  normal: "pad",
  loose: "pad pad-loose",
};

/**
 * Decides every block's background before any of them render.
 *
 * The rule being preserved: two shaded sections must never end up side by side
 * BY ACCIDENT. That used to be guaranteed by deriving the shade from a block's
 * index and storing nothing at all, which also meant the client could not
 * choose. Now they can, so the guarantee has to be kept a different way.
 *
 * Each automatic block takes the opposite of whatever resolved before it,
 * rather than reading its own position. With every block on "auto" that is
 * exactly the old `index % 2` — the two band blocks still take their turn even
 * though they paint themselves, so a page built before this renders unchanged.
 * Where the client has chosen, the next automatic block contrasts with that
 * choice instead of ignoring it.
 *
 * Two creams in a row are still reachable, by choosing cream twice. That is a
 * decision somebody made and can see in the preview beside them, which is a
 * different thing from a page that changed because a block was dragged.
 */
function shades(blocks: PageBlock[]): Map<string, Shade> {
  /* The rule itself lives in `block-shades`, because the template picker draws
     the same banding in miniature and two copies of an alternation that depends
     on what resolved BEFORE each block would not stay in step. What is local
     here is putting the answers, which come back by position, back onto ids. */
  const resolved = shadeBlocks(blocks);

  const byId = new Map<string, Shade>();
  blocks.forEach((block, index) => {
    const shade = resolved[index];
    if (shade) byId.set(block.id, shade);
  });
  return byId;
}

function sectionProps(block: LaidBlock, shade: Shade | undefined) {
  return {
    className: SPACING[block.spacing],
    style: shade === "cream" ? { background: "var(--cream)" } : undefined,
  };
}

function wrapClass(block: LaidBlock, extra = ""): string {
  return extra ? `${WIDTH[block.width]} ${extra}` : WIDTH[block.width];
}

export function PageBlocks({
  blocks,
  form,
  booking,
  categories,
}: {
  blocks: PageBlock[];
  form: ContactPage["form"];
  booking: SiteContent["booking"];
  categories: AuctionItem[];
}) {
  const shade = shades(blocks);

  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case "richText":
            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div
                  className={wrapClass(
                    block,
                    block.align === "centre" ? "center" : ""
                  )}
                >
                  {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
                  {block.heading && <h2 className="section-title">{block.heading}</h2>}
                  <div className="block-prose">
                    <Prose body={block.body} />
                  </div>
                </div>
              </section>
            );

          case "imageAndText":
            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div
                  className={wrapClass(
                    block,
                    `block-split${block.imageSide === "right" ? " is-reversed" : ""}`
                  )}
                >
                  <div className="block-split-media">
                    <Image
                      src={block.image.src}
                      alt={block.image.alt}
                      width={block.image.width ?? 900}
                      height={block.image.height ?? 600}
                      sizes="(max-width: 860px) 100vw, 46vw"
                    />
                  </div>
                  <div className="block-split-body">
                    {block.heading && <h2 className="section-title">{block.heading}</h2>}
                    <div className="block-prose">
                      <Prose body={block.body} />
                    </div>
                  </div>
                </div>
              </section>
            );

          case "callToAction":
            return (
              <section key={block.id} className="pad cta-band">
                <div className="wrap center">
                  <h2 className="section-title">{block.heading}</h2>
                  {block.lede && <p className="section-lede">{block.lede}</p>}
                  <div className="section-cta">
                    <Cta cta={block.cta} />
                  </div>
                </div>
              </section>
            );

          case "questions":
            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div className={wrapClass(block)}>
                  {block.heading && (
                    <div className={block.align === "centre" ? "center" : undefined}>
                      <h2 className="section-title">{block.heading}</h2>
                    </div>
                  )}
                  {/* No `path`: this list lives in a custom page's document, not
                      in one of the eight the admin preview maps. Passing no path
                      means the markers are simply not emitted, which is the
                      documented way to opt out. */}
                  <FaqAccordion faqs={block.items} />
                </div>
              </section>
            );

          case "enquiryForm":
            return (
              <section key={block.id} className="pad contact">
                <div className="wrap">
                  <div>
                    <h2 className="section-title">{block.heading}</h2>
                    {block.lede && (
                      <p
                        className="section-lede"
                        style={{ color: "rgba(255,255,255,0.8)" }}
                      >
                        {block.lede}
                      </p>
                    )}
                  </div>
                  {/* The same form and the same endpoint as everywhere else.
                      `source` carries the page it was sent from, so an enquiry
                      from a client-built page is still attributable. */}
                  <ContactForm
                    form={form}
                    booking={booking}
                    idPrefix={`block-${block.id}`}
                    source="custom-page"
                  />
                </div>
              </section>
            );

          case "catalogTeaser":
            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div className={wrapClass(block)}>
                  {(block.heading || block.lede) && (
                    <div className={block.align === "centre" ? "center" : undefined}>
                      {block.heading && (
                        <h2 className="section-title">{block.heading}</h2>
                      )}
                      {block.lede && <p className="section-lede">{block.lede}</p>}
                    </div>
                  )}
                  <BentoGrid
                    items={categories.slice(0, block.count)}
                    variant="uniform"
                  />
                </div>
              </section>
            );

          case "columns": {
            /* Three columns are equal whatever the ratio says, which is what
               the field's own description tells the client. Read off the
               column count rather than stored beside it, so the two can never
               disagree about a page that already exists. */
            const arrangement =
              block.columns.length >= 3 ? "thirds" : block.ratio;

            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div className={wrapClass(block)}>
                  {block.heading && (
                    <div className={block.align === "centre" ? "center" : undefined}>
                      <h2 className="section-title">{block.heading}</h2>
                    </div>
                  )}
                  <div className={`block-columns is-${arrangement}`}>
                    {block.columns.map((column) => (
                      <div key={column.id} className="block-column">
                        {column.items.map((item) => (
                          <ColumnPiece key={item.id} item={item} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          case "testimonials":
            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div className={wrapClass(block)}>
                  <BlockHead
                    heading={block.heading}
                    lede={block.lede}
                    centred={block.align === "centre"}
                  />
                  {/* The testimonials page's grid, not its marquee: the marquee
                      duplicates every card to loop and animates them past, which
                      is a feature of a page that exists to show them off and a
                      distraction on a page about something else. No `path`, as
                      for the questions block — this list is the page's own. */}
                  <div className="t-grid">
                    {block.items.map((item) => (
                      <TestimonialCard key={item.id} testimonial={item} />
                    ))}
                  </div>
                </div>
              </section>
            );

          case "gallery":
            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div className={wrapClass(block)}>
                  <BlockHead heading={block.heading} centred={block.align === "centre"} />
                  <div className={`block-gallery is-${block.columns}`}>
                    {block.images.map(({ id, image, caption }) => (
                      <figure key={id} className="block-gallery-tile">
                        {/* `fill` inside a fixed-ratio frame: the tile decides
                            the shape and the photograph is cropped to it, so a
                            portrait among landscapes stays in its row. */}
                        <div className="block-gallery-media">
                          <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            sizes={
                              block.columns === "two"
                                ? "(max-width: 760px) 100vw, 50vw"
                                : block.columns === "four"
                                  ? "(max-width: 760px) 50vw, 25vw"
                                  : "(max-width: 760px) 100vw, 33vw"
                            }
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                        {caption && <figcaption>{caption}</figcaption>}
                      </figure>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "video":
            /* Checked again here, as /auction-info checks its own. The schema
               refused a bad address on save; this is what runs when the
               document arrives by any other route, and a refused address
               renders no player rather than a frame pointed somewhere else. */
            if (!isAllowedEmbed(block.embedUrl)) return null;
            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div className={wrapClass(block, "block-video")}>
                  <h2 className="section-title">{block.heading}</h2>
                  {block.lede && <p className="page-video-lede">{block.lede}</p>}
                  <div className="page-video-frame">
                    <iframe
                      src={block.embedUrl}
                      title={block.heading}
                      loading="lazy"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  </div>
                  {block.caption && <p className="page-video-caption">{block.caption}</p>}
                </div>
              </section>
            );

          case "team":
            return (
              <section key={block.id} {...sectionProps(block, shade.get(block.id))}>
                <div className={wrapClass(block)}>
                  <BlockHead
                    heading={block.heading}
                    lede={block.lede}
                    centred={block.align === "centre"}
                  />
                  <div className="block-team">
                    {block.people.map((person) => (
                      <article key={person.id} className="block-person">
                        <div className="block-person-portrait">
                          {person.photo ? (
                            <Image
                              src={person.photo.src}
                              alt={person.photo.alt}
                              fill
                              sizes="(max-width: 760px) 100vw, 360px"
                              style={{ objectFit: "cover", objectPosition: "center top" }}
                            />
                          ) : (
                            <span className="auc-avatar" aria-hidden="true">
                              {initialsOf(person.name)}
                            </span>
                          )}
                        </div>
                        <div className="block-person-body">
                          <h3 className="block-person-name">{person.name}</h3>
                          {person.role && <p className="block-person-role">{person.role}</p>}
                          <div className="block-prose">
                            <Prose body={person.bio} />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            );
        }
      })}
    </>
  );
}
