/**
 * Lead context vocabulary.
 *
 * Every enquiry on the site — the plain contact form, a request for a specific
 * lot, a request for an auctioneer, and the auction planner quiz — posts the
 * same six visible fields to the same `/api/contact`. What differs is the
 * *context* travelling alongside them: where the lead came from and what it is
 * about. Keeping that as additive metadata rather than separate forms or
 * endpoints is what lets one downstream automation handle every lead shape.
 *
 * This module is deliberately free of content imports so it can be pulled into
 * a client bundle. The id -> label registry lives in `interests.ts`, which is
 * server-side because it reaches into the whole catalog.
 *
 * Trust model
 * -----------
 * Everything here arrives from the browser and ends up in a notification a
 * human will read, so none of it can be taken at face value. Two rules:
 *
 *   1. The client sends an *identifier*, never a display label. The server
 *      resolves the id against the catalog and derives the label itself, so a
 *      hand-crafted `?interest=` cannot inject text into the client's alerts.
 *   2. Every value is validated against a closed vocabulary where one exists,
 *      and length-capped and stripped of control characters where one does not.
 */

/** Which surface produced the lead. Closed set — anything else is rejected. */
export const LEAD_SOURCES = [
  "contact-page",
  "home",
  "category-request",
  "item-request",
  "auctioneer-request",
  "quiz",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** What the lead is about. Derived from the resolved interest, not trusted. */
export const INTEREST_TYPES = [
  "general",
  "category",
  "item",
  "auctioneer",
  "quiz",
] as const;
export type InterestType = (typeof INTEREST_TYPES)[number];

/**
 * Context keys the *client* is allowed to submit.
 *
 * `interestLabel`, `interestCategory` and `contextSummary` are absent on
 * purpose: those are display strings, and the server derives them from
 * `interestId` so the browser can never dictate what the notification says.
 */
export const CLIENT_CONTEXT_KEYS = [
  "source",
  "sourcePath",
  "interestId",
  "quizEventType",
  "quizAttendance",
  "quizPriceBand",
  "quizInterests",
  "quizRecommended",
] as const;
export type ClientContextKey = (typeof CLIENT_CONTEXT_KEYS)[number];

/** The context a page hands to the form. All optional; all plain strings. */
export type LeadContext = Partial<Record<ClientContextKey, string>>;

/**
 * Upper bound on any single context value.
 *
 * Generous for a slug list, far below anything that could pad out an SMS into
 * multiple billed segments or overflow a spreadsheet cell.
 */
const MAX_CONTEXT_LENGTH = 300;

/** C0 controls and DEL. Written as codes rather than a regex escape range so
 *  the intent survives copy/paste and reformatting. */
function isControlChar(code: number): boolean {
  return code < 0x20 || code === 0x7f;
}

/**
 * Normalise one context value.
 *
 * Control characters — newlines especially — are replaced rather than escaped:
 * these values are interpolated into a single-line summary and, downstream,
 * into SMS and spreadsheet cells, where an embedded newline silently changes
 * the shape of the record.
 */
export function sanitizeContextValue(value: unknown): string {
  if (typeof value !== "string") return "";

  let out = "";
  for (const ch of value) {
    out += isControlChar(ch.charCodeAt(0)) ? " " : ch;
  }

  return out.replace(/\s+/g, " ").trim().slice(0, MAX_CONTEXT_LENGTH);
}

/** True when `value` is one of the known lead sources. */
export function isLeadSource(value: unknown): value is LeadSource {
  return (
    typeof value === "string" && (LEAD_SOURCES as readonly string[]).includes(value)
  );
}

/**
 * Accept only root-relative in-site paths.
 *
 * `sourcePath` is echoed into the notification so the client can see which page
 * a lead came from. Rejecting absolute and protocol-relative URLs stops that
 * line being used to plant a link to somewhere else.
 */
export function sanitizeSourcePath(value: unknown): string {
  const path = sanitizeContextValue(value);
  if (!path.startsWith("/") || path.startsWith("//")) return "";
  return path;
}

/**
 * Build the single human-readable line describing the enquiry.
 *
 * Exists so a downstream automation can include useful context in a message
 * without having to understand — or be redeployed for — every individual
 * field. If only one of the new fields is ever consumed, this is the one.
 */
export function buildContextSummary(input: {
  source?: string;
  interestType: InterestType;
  interestLabel?: string;
  interestCategory?: string;
  quizRecommendedLabels?: string[];
}): string {
  const { interestType, interestLabel, interestCategory } = input;

  switch (interestType) {
    case "item":
      return interestCategory
        ? `Item request: ${interestLabel} (${interestCategory})`
        : `Item request: ${interestLabel}`;
    case "category":
      return `Category enquiry: ${interestLabel}`;
    case "auctioneer":
      return `Auctioneer request: ${interestLabel}`;
    case "quiz": {
      const picks = input.quizRecommendedLabels?.filter(Boolean) ?? [];
      return picks.length
        ? `Auction planner quiz — recommended: ${picks.join(", ")}`
        : "Auction planner quiz";
    }
    default:
      return input.source === "home"
        ? "General enquiry (home page form)"
        : "General enquiry (contact page)";
  }
}
