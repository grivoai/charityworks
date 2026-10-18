import { Fragment } from "react";
import type { EditableMark } from "@/lib/editable";

/**
 * A plain-text field drawn with the line breaks the client typed.
 *
 * The admin gives these fields a textarea, and a textarea keeps every Enter —
 * but a browser shows a newline inside a paragraph as a space, so a client who
 * put each sentence on its own line saw them all run together on the page. The
 * stored text was right the whole time; only the drawing lost it.
 *
 * A blank line starts a new paragraph and a single line break is a `<br>`.
 * Nothing else is read into the text: it is not Markdown, and an asterisk is an
 * asterisk.
 *
 * Three shapes come out, and which one is decided by the text alone:
 *
 *   NO LINE BREAK — one `<p>` holding the text untouched, which is exactly what
 *   every one of these fields rendered before this existed. Nearly all content
 *   is this shape, and none of it may change.
 *
 *   ONE PARAGRAPH — still one `<p>`, with a `<br>` at each break.
 *
 *   SEVERAL — a `<div>` carrying the class and the preview marker, with a `<p>`
 *   per paragraph inside. A `<div>` and not a `<p>`, because a `<p>` cannot
 *   hold another one: the parser closes the outer one early and the class and
 *   marker end up on an empty element. `.text-block` makes the inner
 *   paragraphs take their size and colour from the wrapper, so a class written
 *   for the `<p>` (the dashed note, the section lede) still looks the same.
 *
 * `inline` keeps every shape to one `<p>`, a blank line counting as a single
 * break. It is for a clamped teaser — the section tiles show three lines of a
 * blurb — where the clamp only works on one box and a paragraph gap would
 * spend a line of the three on nothing.
 *
 * Only for what is drawn as body text. Meta tags, JSON-LD and the admin's list
 * rows read the field as a string and never come through here.
 */
export function TextBlock({
  text,
  className,
  mark,
  inline = false,
}: {
  text: string;
  className?: string;
  mark?: EditableMark;
  inline?: boolean;
}) {
  if (!text.includes("\n")) {
    return (
      <p className={className} {...mark}>
        {text}
      </p>
    );
  }

  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0);

  if (inline || paragraphs.length <= 1) {
    return (
      <p className={className} {...mark}>
        <Lines lines={paragraphs.flat()} />
      </p>
    );
  }

  return (
    <div
      className={className ? `${className} text-block` : "text-block"}
      {...mark}
    >
      {paragraphs.map((lines, index) => (
        <p key={index}>
          <Lines lines={lines} />
        </p>
      ))}
    </div>
  );
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  );
}
