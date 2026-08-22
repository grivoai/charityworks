import type { PageBlockInput } from "@/content/schema";

/**
 * Starting arrangements for a new client-built page.
 *
 * A page that opens empty asks the client to answer "what goes on a page?"
 * before they can write a word, and the honest answer is that they do not know
 * — that is why they are using a page builder rather than writing HTML. A
 * template answers it with a shape they can edit, which is a much smaller
 * question than a shape they have to invent.
 *
 * THE PLACEHOLDER COPY IS MEANT TO BE REPLACED, and is written so that leaving
 * it in place looks obviously unfinished rather than subtly wrong. Copy that
 * reads as plausible finished text ("Welcome to our organisation") is the kind
 * that survives to production; copy that names what belongs there does not.
 *
 * No template uses `imageAndText`. That block requires a real `image.src` and
 * alt text, and a template cannot invent a photograph — it would either ship a
 * broken image reference or silently adopt some unrelated file already on the
 * site. Adding a picture is a deliberate step, so it is left to one.
 *
 * Ids are assigned by `createCustomPage` rather than written here, because a
 * template is a value that may be used many times and two pages created from
 * one template must not share block ids.
 */

/**
 * A block before it has been given an id.
 *
 * Built from `PageBlockInput`, not `PageBlock`: the layout fields carry
 * defaults, and a template that does not care about width or spacing should
 * not have to say so. A template that does care can still set them — the
 * landing page's catalog teaser runs full width because it asks to.
 */
type Strip<T> = Omit<T, "id">;

export type TemplateBlock =
  | Strip<Extract<PageBlockInput, { type: "richText" }>>
  | (Omit<Extract<PageBlockInput, { type: "callToAction" }>, "id" | "cta"> & {
      cta: Omit<Extract<PageBlockInput, { type: "callToAction" }>["cta"], "id">;
    })
  | (Omit<Extract<PageBlockInput, { type: "questions" }>, "id" | "items"> & {
      items: Omit<
        Extract<PageBlockInput, { type: "questions" }>["items"][number],
        "id"
      >[];
    })
  | Strip<Extract<PageBlockInput, { type: "enquiryForm" }>>
  | Strip<Extract<PageBlockInput, { type: "catalogTeaser" }>>;

export interface PageTemplate {
  id: string;
  label: string;
  /** One line, shown under the label in the picker. */
  description: string;
  /** Filled into the page's `intro`. Empty for Blank. */
  intro: string;
  blocks: TemplateBlock[];
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    description: "An empty page. Add the blocks you want.",
    intro: "",
    blocks: [],
  },
  {
    id: "event",
    label: "Event page",
    description:
      "For one dated event: what and when, the details, questions, and a way to reply.",
    intro: "Add the date, time and venue here.",
    blocks: [
      {
        type: "richText",
        eyebrow: "REPLACE — date and place, e.g. “14 October · The Grand Hall”",
        heading: "REPLACE — the name of the event",
        body:
          "REPLACE — two or three sentences on what the evening is and who it is " +
          "for.\n\nA blank line starts a new paragraph, so this is a second one. " +
          "Use it for the part people ask about most: what the ticket includes, " +
          "or what the money goes towards.",
      },
      {
        type: "richText",
        heading: "REPLACE — the details",
        body:
          "REPLACE — the practical facts. Doors, dress, parking, whether there " +
          "is a meal, when the auction starts.",
      },
      {
        type: "questions",
        heading: "Questions",
        items: [
          {
            question: "REPLACE — a question people actually ask",
            answer: "REPLACE — the answer, in a sentence or two.",
          },
          {
            question: "REPLACE — a second question",
            answer: "REPLACE — its answer.",
          },
        ],
      },
      {
        type: "enquiryForm",
        heading: "Ask about this event",
        lede: "REPLACE — one line telling people what happens after they send this.",
      },
    ],
  },
  {
    id: "announcement",
    label: "Announcement",
    description: "One short message with a single next step. For news and notices.",
    intro: "",
    blocks: [
      {
        type: "richText",
        eyebrow: "REPLACE — a date or a label, e.g. “Announcement”",
        heading: "REPLACE — what has happened, in one line",
        body:
          "REPLACE — the announcement itself. Keep it to a paragraph or two; a " +
          "notice that runs long stops being read.",
      },
      {
        type: "callToAction",
        heading: "REPLACE — what you would like people to do next",
        lede: "REPLACE — one line on why, or delete this line.",
        cta: {
          label: "Get in touch",
          href: "/contact",
          variant: "primary",
        },
      },
    ],
  },
  {
    id: "landing",
    label: "Landing page",
    description:
      "For a campaign or a link you hand out: a pitch, what is on offer, and a form.",
    intro: "One or two lines under the heading. Say who this page is for.",
    blocks: [
      {
        type: "richText",
        heading: "REPLACE — the promise, in one line",
        body:
          "REPLACE — the pitch. What is on offer, who it is for, and why it is " +
          "worth their time. Two short paragraphs beats one long one.\n\n" +
          "REPLACE — the second paragraph, or delete it.",
      },
      {
        type: "catalogTeaser",
        heading: "REPLACE — a line introducing the items",
        lede: "REPLACE — one line, or delete it.",
        count: 3,
      },
      {
        type: "richText",
        heading: "REPLACE — how it works",
        body:
          "REPLACE — the steps, or the reassurance. This is the block people " +
          "read just before deciding.",
      },
      {
        type: "enquiryForm",
        heading: "Start a conversation",
        lede: "REPLACE — one line telling people what happens after they send this.",
      },
    ],
  },
];

export const DEFAULT_TEMPLATE_ID = "blank";

/** One template by id, or the blank one if the id is not recognised. */
export function templateById(id: string | undefined): PageTemplate {
  return (
    PAGE_TEMPLATES.find((template) => template.id === id) ??
    PAGE_TEMPLATES.find((template) => template.id === DEFAULT_TEMPLATE_ID)!
  );
}
