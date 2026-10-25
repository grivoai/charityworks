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
 *   - a line starting "- " is a list item, and bullet lines separated by
 *     blank lines are still one list; `inline` draws them as "• " lines
 *   - the FAQ's free vacation explanation is drawn through it, and any text
 *     with no bullets comes out exactly as the page's own split drew it
 *   - every field drawn through it carries the bullet hint in the admin
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
import {
  BULLET_HINT,
  auctionItemSchema,
  categoryGroupSchema,
  categoryItemSchema,
  pageSchemas,
} from "@/content/schema";
import { faqsPage } from "@/content/pages/faqs";

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
    /\.text-block > p, \.text-block > ul \{ font: inherit; color: inherit; \}\s*\.text-block > p \+ p,/.test(css),
    "the wrapper's paragraphs take its size and colour"
  );
}

console.log("\nBullets");
{
  // The client's free vacation text as it is stored, with the "- " she will
  // add: every bullet its own paragraph, indented, blank lines between.
  const lead =
    "There are many ways to use this FREE mini vacation package. Some suggestions might include:";
  const items = [
    "Giving it away with every ticket purchase",
    "Giving it away with every Silent Auction bid",
    "Giving it away with every maximum Raffle buy-in",
    "Giving it away to every donor who makes a pledge or fund-a-need donation",
    'Giving it away as a "Thank You" to every volunteer and/or sponsor',
    'OR creating a way to use it as a "Thank You" within the framework of your event',
  ];
  const text =
    `Every guest gets one.\n\n${lead}\n\n` +
    items.map((item) => `    - ${item}`).join("\n\n") +
    "\n\n\nRecipients register their certificate.";
  const html = render({ text, className: "faq-incentive-body", mark, block: true });
  const escaped = (s: string) => s.replace(/"/g, "&quot;");
  check(
    html ===
      '<div class="faq-incentive-body" data-cw="intro">' +
        "<p>Every guest gets one.</p>" +
        `<p>${lead}</p>` +
        '<ul class="text-list">' +
        items.map((item) => `<li>${escaped(item)}</li>`).join("") +
        "</ul>" +
        "<p>Recipients register their certificate.</p></div>",
    "her six lines, blank lines between, are ONE <ul> of six <li>"
  );
  check(
    (html.match(/<ul/g) ?? []).length === 1 &&
      (html.match(/<li>/g) ?? []).length === 6,
    "exactly one list, exactly six items"
  );
  check(!html.includes("- "), 'the "- " is not drawn');

  check(
    render({ text: "Includes:\n- Two nights\n- Show tickets\nAsk for dates." }) ===
      '<div class="text-block"><p>Includes:</p>' +
        '<ul class="text-list"><li>Two nights</li><li>Show tickets</li></ul>' +
        "<p>Ask for dates.</p></div>",
    "a list in the middle of a paragraph splits it around the list"
  );
  check(
    render({ text: "- One\n\nBetween.\n\n- Two" }) ===
      '<div class="text-block"><ul class="text-list"><li>One</li></ul>' +
        '<p>Between.</p><ul class="text-list"><li>Two</li></ul></div>',
    "a paragraph between bullets makes two lists"
  );
  check(
    render({ text: "- Only one", mark }) ===
      '<div class="text-block" data-cw="intro"><ul class="text-list"><li>Only one</li></ul></div>',
    "a single bullet line is a list, with the marker on the wrapper"
  );
  check(
    render({ text: "-no space\n—an em dash\n-\n1990 - 2026" }) ===
      "<p>-no space<br/>—an em dash<br/>-<br/>1990 - 2026</p>",
    'only "- " at the start of a line is a bullet'
  );
  check(
    render({ text: "- <b>x</b>\n- y" }) ===
      '<div class="text-block"><ul class="text-list"><li>&lt;b&gt;x&lt;/b&gt;</li><li>y</li></ul></div>',
    "markup in a bullet is escaped"
  );
  check(!nestsParagraphs(html), "no <p> inside a <p>");

  const inline = render({ text: "Includes:\n\n- Two nights\n- Shows", inline: true });
  check(
    inline === "<p>Includes:<br/>• Two nights<br/>• Shows</p>",
    "inline keeps one <p>, bullets as • lines, so the tile clamp still works"
  );
  check(!inline.includes("<ul"), "inline never draws a list");
}

console.log("\nThe FAQ's free vacation explanation");
{
  /** What faqs/page.tsx drew before it used TextBlock, verbatim. */
  const before = (body: string) =>
    renderToStaticMarkup(
      createElement(
        "div",
        { className: "faq-incentive-body", ...editable("incentive.body") },
        body
          .split(/\n\s*\n/)
          .map((part) => part.trim())
          .filter(Boolean)
          .map((paragraph, index) => createElement("p", { key: index }, paragraph))
      )
    );
  const after = (body: string) =>
    render({
      text: body,
      className: "faq-incentive-body",
      mark: editable("incentive.body"),
      block: true,
    });

  // The live wording on 24 October 2026, before any "- " was added — the
  // indented lines, the triple newline and the trailing space are hers.
  const live =
    "Every guest at your event can be offered a Las Vegas vacation package — hotel nights and show tickets donated by our partners. It costs your nonprofit nothing: we supply the certificates, you hand them out.\n\nThere are many ways to use this FREE mini vacation package. Some suggestions might include:\n\n    Giving it away with every ticket purchase\n\n    Giving it away with every Silent Auction bid\n\n    Giving it away with every maximum Raffle buy-in\n\n    Giving it away to every donor who makes a pledge or fund-a-need donation\n\n    Giving it away as a \"Thank You\" to every volunteer and/or sponsor\n\n    OR creating a way to use it as a \"Thank You\" within the framework of your event\n\n\nRecipients register their certificate with OUR fulfillment partner and can then choose their own dates to travel.\n\nThese are Las Vegas strip hotels and the vacation is good from Sunday - Thursday. Advance booking and subject to hotel availability \n\nTravel costs such as air fair, etc are the travelers own extensions and upgrades available subject to availability.\n\nYour certificates to give your guest will be sent to you as a printable hard copy certificate (3 to a page) OR a hyper link that you can put in an email to all your guests.";
  const samples: Array<[string, string]> = [
    ["the live wording", live],
    ["the seed wording", faqsPage.incentive?.body ?? ""],
    ["one paragraph", "Just one paragraph."],
    ["padding and extra blank lines", "  First.  \n\n\n\n Second.\n\n"],
    ["Windows line endings", "First.\r\n\r\nSecond."],
    ["blank lines holding spaces", "First.\n  \t \nSecond."],
  ];
  for (const [label, body] of samples) {
    check(body !== "" && after(body) === before(body), `${label}: identical to before`);
  }

  const page = readFileSync("app/(site)/faqs/page.tsx", "utf8");
  check(
    /<TextBlock\s+text=\{page\.incentive\.body\}\s+className="faq-incentive-body"\s+mark=\{editable\("incentive\.body"\)\}\s+block\s*\/>/.test(page),
    "faqs/page.tsx draws incentive.body through TextBlock, block, with its marker"
  );
  check(
    !/page\.incentive\.body\s*\.split/.test(page),
    "and no longer splits it by hand"
  );
}

console.log("\nThe bullet hint in the admin");
{
  type Described = { description?: string };
  const fields: Array<[string, Described | undefined]> = [
    ["category intro", auctionItemSchema.shape.intro],
    ["section blurb", categoryGroupSchema.shape.blurb],
    ["lot description", categoryItemSchema.shape.description],
    ["lot note", categoryItemSchema.shape.note],
    [
      "FAQ free vacation explanation",
      pageSchemas.faqs.shape.incentive.unwrap().shape.body,
    ],
  ];
  for (const [label, schema] of fields) {
    check(
      schema?.description?.endsWith(BULLET_HINT) ?? false,
      `${label} ends with the hint`
    );
  }
  check(
    !auctionItemSchema.shape.blurb.description?.includes(BULLET_HINT),
    "the category blurb, drawn as a plain string, does not promise bullets"
  );

  // Every TextBlock that is marked on a page is one of the fields above, so a
  // new one cannot be added without deciding about its hint.
  const marked = new Set<string>();
  for (const file of ["app/(site)/auction-items/[slug]/page.tsx", "app/(site)/faqs/page.tsx"]) {
    const source = readFileSync(file, "utf8");
    for (const [, field] of source.matchAll(/<TextBlock\s+text=\{([\w.?]+)\}/g)) {
      marked.add(field);
    }
  }
  const known = new Set([
    "category.intro",
    "group.blurb",
    "item.description",
    "item.note",
    "page.incentive.body",
  ]);
  check(
    [...marked].every((field) => known.has(field)) && marked.size === known.size,
    `every TextBlock field is one with the hint (${[...marked].join(", ")})`
  );

  const css = readFileSync("app/globals.css", "utf8");
  check(
    /\.text-list \{ list-style: disc;/.test(css),
    "the list puts back the bullets the global reset removes"
  );
  for (const context of [".cat-group-head", ".cat-card-body"]) {
    check(
      new RegExp(`\\${context} > \\.text-block \\{ color: var\\(--muted\\);`).test(css),
      `${context}'s wrapped paragraphs and lists keep its muted size and colour`
    );
  }
}

console.log(failures ? `\n${failures} failed\n` : "\nall passed\n");
process.exit(failures ? 1 : 0);
