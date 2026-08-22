import Image from "next/image";

import type { PageBlock } from "@/content/schema";
import type { AuctionItem, ContactPage, SiteContent } from "@/content/types";
import { Cta } from "@/components/Section";
import { BentoGrid } from "@/components/BentoGrid";
import { ContactForm } from "@/components/ContactForm";
import { FaqAccordion } from "@/components/FaqAccordion";

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

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

type Width = "narrow" | "contained" | "full";
type Spacing = "tight" | "normal" | "loose";
type Shade = "paper" | "cream";

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

/** A block carrying layout controls. The two band blocks deliberately do not. */
type Laid = Extract<PageBlock, { background: Shade | "auto" }>;

const isLaid = (block: PageBlock): block is Laid => "background" in block;

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
  const resolved = new Map<string, Shade>();
  // Starts on cream so the first automatic block lands on paper, as it does today.
  let previous: Shade = "cream";

  for (const block of blocks) {
    const next: Shade =
      isLaid(block) && block.background !== "auto"
        ? block.background
        : previous === "cream"
          ? "paper"
          : "cream";

    if (isLaid(block)) resolved.set(block.id, next);
    previous = next;
  }

  return resolved;
}

function sectionProps(block: Laid, shade: Shade | undefined) {
  return {
    className: SPACING[block.spacing],
    style: shade === "cream" ? { background: "var(--cream)" } : undefined,
  };
}

function wrapClass(block: Laid, extra = ""): string {
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
        }
      })}
    </>
  );
}
