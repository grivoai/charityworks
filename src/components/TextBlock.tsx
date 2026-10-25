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
 * Apart from the bullet below, nothing else is read into the text: it is not
 * Markdown, and an asterisk is an asterisk.
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
 * The one other thing read into the text is a bullet: a line starting "- "
 * becomes an item of a `<ul class="text-list">`, always inside the `<div>`
 * shape, since a list cannot sit in a `<p>`. Bullet lines next to each other
 * are one list even with blank lines between them — the client spaces lists
 * out that way, and six one-item lists would draw six paragraph gaps.
 *
 * `inline` keeps every shape to one `<p>`, a blank line counting as a single
 * break and a bullet drawn as "• " in front of its line. It is for a clamped
 * teaser — the section tiles show three lines of a blurb — where the clamp
 * only works on one box and a paragraph gap would spend a line of the three on
 * nothing.
 *
 * `block` is for a class written for a container of paragraphs rather than for
 * a `<p>` (the FAQ's free vacation explanation): the `<div>` shape always, so
 * a single paragraph is still a `<p>` inside it, and without `.text-block`,
 * since the class already styles the paragraphs it holds.
 *
 * Only for what is drawn as body text. Meta tags, JSON-LD and the admin's list
 * rows read the field as a string and never come through here.
 */
export function TextBlock({
  text,
  className,
  mark,
  inline = false,
  block = false,
}: {
  text: string;
  className?: string;
  mark?: EditableMark;
  inline?: boolean;
  block?: boolean;
}) {
  if (!block && !text.includes("\n") && !isBullet(text.trim())) {
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

  const hasBullets = paragraphs.some((lines) => lines.some(isBullet));

  if (inline) {
    return (
      <p className={className} {...mark}>
        <Lines
          lines={paragraphs
            .flat()
            .map((line) => (isBullet(line) ? `• ${bulletText(line)}` : line))}
        />
      </p>
    );
  }

  if (!block && !hasBullets && paragraphs.length <= 1) {
    return (
      <p className={className} {...mark}>
        <Lines lines={paragraphs.flat()} />
      </p>
    );
  }

  const wrapperClass = block
    ? className
    : className
      ? `${className} text-block`
      : "text-block";

  return (
    <div className={wrapperClass} {...mark}>
      {pieces(paragraphs).map((piece, index) =>
        piece.kind === "list" ? (
          <ul key={index} className="text-list">
            {piece.lines.map((line, item) => (
              <li key={item}>{line}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            <Lines lines={piece.lines} />
          </p>
        )
      )}
    </div>
  );
}

function isBullet(line: string): boolean {
  return line.startsWith("- ");
}

function bulletText(line: string): string {
  return line.slice(2).trim();
}

type Piece = { kind: "paragraph" | "list"; lines: string[] };

/**
 * Paragraphs into what is drawn: runs of ordinary lines stay a paragraph each,
 * and runs of bullet lines become a list. A list that reaches the end of one
 * paragraph carries on into a list that starts the next, so a blank line
 * between two bullets does not split them.
 */
function pieces(paragraphs: string[][]): Piece[] {
  const out: Piece[] = [];
  paragraphs.forEach((lines) => {
    let current: Piece | undefined;
    lines.forEach((line, index) => {
      const kind = isBullet(line) ? "list" : "paragraph";
      const value = kind === "list" ? bulletText(line) : line;
      if (current?.kind === kind) {
        current.lines.push(value);
        return;
      }
      const previous = out[out.length - 1];
      if (index === 0 && kind === "list" && previous?.kind === "list") {
        current = previous;
      } else {
        current = { kind, lines: [] };
        out.push(current);
      }
      current.lines.push(value);
    });
  });
  return out;
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
