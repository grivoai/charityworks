import { pageBlockSchema, type PageBlock } from "@/content/schema";
import { isLaid, shadeBlocks, type Shade } from "@/content/block-shades";
import { withTemplateIds, type PageTemplate } from "@/lib/admin/page-templates";

/**
 * A template drawn as the page it would make.
 *
 * DERIVED FROM THE TEMPLATE, NOT DRAWN BESIDE IT. Four hand-made pictures
 * would be right on the day they were made and wrong the first time somebody
 * adds a block to `PAGE_TEMPLATES` — and wrong in the worst way, because a
 * picture is believed. Reading the blocks means the thumbnail cannot describe
 * a template that no longer exists.
 *
 * It is a wireframe rather than a rendering: grey bars where the words go. The
 * question somebody is answering at this point is "what SHAPE is this page",
 * and legible placeholder text at 90 pixels tall is not on offer anyway. What
 * it does carry is the three things that actually differ between the four —
 * how many sections, how wide each one sits, and where the shaded bands fall.
 *
 * Rendered on the server and handed to the picker as an element, so the schema
 * (and zod behind it) stays out of the admin's client bundle.
 */

/* ------------------------------------------------------------------ */
/* Resolving a template to real blocks                                 */
/* ------------------------------------------------------------------ */

/**
 * Template blocks are `PageBlockInput`: no ids, and the layout fields left off
 * wherever the schema's default is wanted. Parsing them through the schema is
 * what fills those in — so the widths and backgrounds drawn here are the ones
 * the page will actually use, rather than a second copy of the defaults kept
 * in step by hand. `withTemplateIds` supplies the ids the parse insists on:
 * the same helper the create action uses, so what is drawn is built exactly
 * the way the page will be.
 *
 * A block that fails to parse is dropped rather than crashing the picker: the
 * create form still works, and `check:custom-pages` fails the build, which is
 * where a malformed template should be caught.
 */
const RESOLVED = new Map<string, PageBlock[]>();

function blocksOf(template: PageTemplate): PageBlock[] {
  const cached = RESOLVED.get(template.id);
  if (cached) return cached;

  const blocks = withTemplateIds(template.blocks).flatMap((block) => {
    const parsed = pageBlockSchema.safeParse(block);
    return parsed.success ? [parsed.data] : [];
  });

  RESOLVED.set(template.id, blocks);
  return blocks;
}

/* ------------------------------------------------------------------ */
/* Marks                                                               */
/* ------------------------------------------------------------------ */

/** One bar of "text". Width is a percentage of the column it sits in. */
function Bar({ w, tone }: { w: number; tone?: "title" | "eyebrow" | "sub" }) {
  return (
    <span
      className={`tt-bar${tone ? ` is-${tone}` : ""}`}
      style={{ width: `${w}%` }}
    />
  );
}

/** A run of body text: full-width bars, the last one short, as prose sits. */
function Lines({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Bar key={i} w={i === count - 1 ? 66 : 100} />
      ))}
    </>
  );
}

/** How many bars a body deserves: more paragraphs, more lines, up to a point. */
function linesFor(body: string): number {
  const paragraphs = body.split(/\n\s*\n/).filter((part) => part.trim()).length;
  return Math.min(5, Math.max(2, paragraphs * 2));
}

/* ------------------------------------------------------------------ */
/* One block                                                           */
/* ------------------------------------------------------------------ */

/**
 * The switch is exhaustive by construction: every branch returns, and the
 * declared return type means a block type added to the schema without a case
 * here fails the typecheck rather than drawing an empty band.
 */
function Glyph({ block }: { block: PageBlock }): React.ReactElement {
  switch (block.type) {
    case "richText":
      return (
        <>
          {block.eyebrow && <Bar w={24} tone="eyebrow" />}
          {block.heading && <Bar w={58} tone="title" />}
          <Lines count={linesFor(block.body)} />
        </>
      );

    case "imageAndText":
      return (
        <span
          className={`tt-split${block.imageSide === "right" ? " is-reversed" : ""}`}
        >
          <span className="tt-img" />
          <span className="tt-stack">
            {block.heading && <Bar w={72} tone="title" />}
            <Lines count={3} />
          </span>
        </span>
      );

    case "callToAction":
      return (
        <>
          <Bar w={54} tone="title" />
          {block.lede && <Bar w={72} tone="sub" />}
          <span className="tt-pill" />
        </>
      );

    case "questions":
      return (
        <>
          {block.heading && <Bar w={38} tone="title" />}
          <span className="tt-rows">
            {block.items.slice(0, 4).map((item) => (
              <span key={item.id} className="tt-qa">
                <Bar w={70} />
                <span className="tt-chevron" />
              </span>
            ))}
          </span>
        </>
      );

    case "enquiryForm":
      return (
        <>
          <Bar w={46} tone="title" />
          {block.lede && <Bar w={68} tone="sub" />}
          <span className="tt-fields">
            <span className="tt-field" />
            <span className="tt-field" />
            <span className="tt-field is-wide" />
          </span>
        </>
      );

    case "catalogTeaser":
      return (
        <>
          {block.heading && <Bar w={44} tone="title" />}
          {block.lede && <Bar w={64} tone="sub" />}
          <span className="tt-cards">
            {/* Capped at four: the bar is the same width whatever the count, and
                past four they stop reading as cards and start reading as noise. */}
            {Array.from({ length: Math.min(block.count, 4) }, (_, i) => (
              <span key={i} className="tt-card" />
            ))}
          </span>
        </>
      );

    case "columns":
      return (
        <>
          {block.heading && <Bar w={44} tone="title" />}
          {/* Three columns are equal whatever the ratio says — the same rule the
              renderer applies, read off the count for the same reason. */}
          <span
            className={`tt-cols is-${
              block.columns.length >= 3 ? "thirds" : block.ratio
            }`}
          >
            {block.columns.map((column) => (
              <span key={column.id} className="tt-col">
                {column.items.length === 0 && <span className="tt-col-empty" />}
                {column.items.map((item) => {
                  if (item.type === "image")
                    return <span key={item.id} className="tt-img is-small" />;
                  if (item.type === "button")
                    return <span key={item.id} className="tt-pill is-small" />;
                  return (
                    <span key={item.id} className="tt-stack">
                      {item.heading && <Bar w={78} tone="title" />}
                      <Lines count={2} />
                    </span>
                  );
                })}
              </span>
            ))}
          </span>
        </>
      );
  }
}

/** One block, in its band, at its width. */
function Band({ block, shade }: { block: PageBlock; shade: Shade | null }) {
  /* A block with no background field paints its own — the dark call-to-action
     and enquiry bands. It still took its turn in the alternation, which is why
     the shade it was handed is `null` rather than simply absent. */
  if (!isLaid(block)) {
    return (
      <span className="tt-band is-dark">
        <span className="tt-inner is-contained is-centre">
          <Glyph block={block} />
        </span>
      </span>
    );
  }

  const centred = "align" in block && block.align === "centre";

  return (
    <span
      className={`tt-band is-${block.spacing}${shade === "cream" ? " is-cream" : ""}`}
    >
      <span className={`tt-inner is-${block.width}${centred ? " is-centre" : ""}`}>
        <Glyph block={block} />
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */

export function TemplateThumb({ template }: { template: PageTemplate }) {
  const blocks = blocksOf(template);
  const shades = shadeBlocks(blocks);

  return (
    /* Hidden from assistive technology. The label and the sentence under it
       already say what this template is, and "wireframe showing a heading, two
       paragraphs and a form" is a worse version of the sentence that is
       already there. */
    <span className="tt" aria-hidden="true">
      {/* Every custom page renders its title and intro above the blocks, so the
          thumbnail does too. It is also the whole answer for Blank, which is a
          titled page rather than nothing at all — and drawing that is what
          stops Blank reading as "broken". */}
      <span className="tt-band is-hero">
        <span className="tt-inner is-contained is-centre">
          <Bar w={62} tone="title" />
          {template.intro && <Bar w={44} tone="sub" />}
        </span>
      </span>

      {blocks.map((block, index) => (
        <Band key={block.id} block={block} shade={shades[index]} />
      ))}

      {blocks.length === 0 && <span className="tt-empty" />}
    </span>
  );
}
