/**
 * Keeps TextBlock drawing the line breaks the client typed, and nothing else.
 *
 * What it promises, each checked on rendered markup:
 *
 *   - text with no line break comes out exactly as the plain `<p>` it was
 *     before TextBlock existed — class, preview marker, spacing and all
 *   - a single break is a `<br>`, a blank line a new paragraph
 *   - no `<p>` is ever inside another `<p>`
 *   - `inline` keeps everything in one `<p>`, for the clamped section tiles
 *   - text is text: markup typed into a field is escaped, not drawn
 *   - the category page draws its intro, section blurbs and lot descriptions
 *     and notes through it, and the meta tags and JSON-LD still read the
 *     plain string
 *
 *   npm run check:line-breaks
 */
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TextBlock } from "@/components/TextBlock";
import { editable } from "@/lib/editable";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  FAIL  ${m}`);
};
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

const render = (props: Parameters<typeof TextBlock>[0]) =>
  renderToStaticMarkup(createElement(TextBlock, props));

/** True when some `<p>` opens before the previous one has closed. */
function nestsParagraphs(html: string): boolean {
  let depth = 0;
  for (const [tag] of html.matchAll(/<\/?p[\s>]/g)) {
    depth += tag.startsWith("</") ? -1 : 1;
    if (depth > 1) return true;
  }
  return false;
}

const mark = editable("intro");

console.log("\nNo line break — unchanged");
{
  const text = "  One sentence, with  its own spacing. ";
  const before = renderToStaticMarkup(
    createElement("p", { className: "section-lede reveal", ...mark }, text)
  );
  check(
    render({ text, className: "section-lede reveal", mark }) === before,
    "identical to the plain <p> it replaced"
  );
  check(
    render({ text: "Plain." }) === "<p>Plain.</p>",
    "no class and no marker add nothing"
  );
  check(
    render({ text: "Plain.", inline: true }) === "<p>Plain.</p>",
    "inline is the same <p>"
  );
}

console.log("\nSingle line breaks");
{
  const html = render({ text: "First line.\nSecond line.", mark });
  check(
    html === '<p data-cw="intro">First line.<br/>Second line.</p>',
    "one <p> with a <br>"
  );
  check(
    render({ text: "A.\r\nB." }) === "<p>A.<br/>B.</p>",
    "a Windows line ending is a line break too"
  );
}

console.log("\nBlank lines");
{
  // The Gold Albums introduction's shape: a trailing space before a break,
  // and a blank line between each sentence.
  const text =
    "Framed displays arrive ready to hang.\n\nEvery piece is under plexiglass. \n\nAll pieces cost $299.";
  const html = render({ text, className: "section-lede reveal", mark });
  check(
    html ===
      '<div class="section-lede reveal text-block" data-cw="intro">' +
        "<p>Framed displays arrive ready to hang.</p>" +
        "<p>Every piece is under plexiglass.</p>" +
        "<p>All pieces cost $299.</p></div>",
    "a <div> carrying class and marker, a <p> per paragraph"
  );
  check(!nestsParagraphs(html), "no <p> inside a <p>");

  const mixed = render({ text: "One.\nTwo.\n\nThree." });
  check(
    mixed === '<div class="text-block"><p>One.<br/>Two.</p><p>Three.</p></div>',
    "breaks inside a paragraph stay <br>"
  );
  check(
    render({ text: "One.\n \t\nTwo." }) ===
      '<div class="text-block"><p>One.</p><p>Two.</p></div>',
    "a line of only spaces counts as blank"
  );
  check(
    render({ text: "One.\n\n\n\nTwo.\n\n" }) ===
      '<div class="text-block"><p>One.</p><p>Two.</p></div>',
    "extra blank lines make no empty paragraphs"
  );
  check(
    render({ text: "Only.\n\n" }) === "<p>Only.</p>",
    "one paragraph left after trimming is a plain <p>"
  );
}

console.log("\nInline (section tiles)");
{
  const html = render({ text: "One.\n\nTwo.\nThree.", inline: true });
  check(html === "<p>One.<br/>Two.<br/>Three.</p>", "one <p>, every break a <br>");
  check(!nestsParagraphs(html), "no <p> inside a <p>");
}

console.log("\nText stays text");
{
  check(
    render({ text: "<b>bold</b>\n\n<script>x</script>" }) ===
      '<div class="text-block"><p>&lt;b&gt;bold&lt;/b&gt;</p><p>&lt;script&gt;x&lt;/script&gt;</p></div>',
    "markup in a field is escaped"
  );
}

console.log("\nThe category page");
{
  const page = readFileSync("app/(site)/auction-items/[slug]/page.tsx", "utf8");
  for (const field of [
    "category.intro",
    "group.blurb",
    "item.description",
    "item.note",
  ]) {
    check(
      page.includes(`text={${field}}`),
      `${field} is drawn through TextBlock`
    );
    check(
      !new RegExp(`>\\s*\\{${field.replace(".", "\\.")}\\}\\s*<`).test(page),
      `${field} is not drawn as a bare string anywhere`
    );
  }
  check(
    page.includes("text={group.blurb} inline"),
    "the section tile's blurb is inline, so its three-line clamp still works"
  );
  check(
    /description:\s*category\.seo\.description/.test(page),
    "meta description still reads the plain seo field"
  );

  const jsonLd = readFileSync("src/components/JsonLd.tsx", "utf8");
  check(
    !jsonLd.includes("TextBlock"),
    "JSON-LD still reads the plain strings"
  );

  const css = readFileSync("app/globals.css", "utf8");
  check(
    /\.text-block > p \{ font: inherit; color: inherit; \}\s*\.text-block > p \+ p/.test(css),
    "the wrapper's paragraphs take its size and colour"
  );
}

console.log(failures ? `\n${failures} failed\n` : "\nall passed\n");
process.exit(failures ? 1 : 0);
