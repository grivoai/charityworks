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
 * No template uses `imageAndText`, a gallery or a video. Those blocks require
 * a real `image.src` or a real player address, and a template cannot invent
 * either — it would ship a broken reference, or silently adopt some unrelated
 * file or video already on the site. Adding a picture is a deliberate step, so
 * it is left to one; the templates that want one say so in their copy. A team
 * block CAN appear, because its photograph is optional and a person without
 * one is drawn as initials rather than as a broken image.
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
  | Strip<Extract<PageBlockInput, { type: "catalogTeaser" }>>
  | (Omit<Extract<PageBlockInput, { type: "testimonials" }>, "id" | "items"> & {
      items: Omit<
        Extract<PageBlockInput, { type: "testimonials" }>["items"][number],
        "id"
      >[];
    })
  | (Omit<Extract<PageBlockInput, { type: "team" }>, "id" | "people"> & {
      people: Omit<
        Extract<PageBlockInput, { type: "team" }>["people"][number],
        "id"
      >[];
    });

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
  {
    id: "team",
    label: "Meet the team",
    description:
      "The people behind something: a short introduction, one card each, and a way to reach them.",
    intro: "REPLACE — one line on who these people are to the reader.",
    blocks: [
      {
        type: "richText",
        heading: "REPLACE — who you will be working with",
        body:
          "REPLACE — a paragraph on the group as a whole: what they do together " +
          "and what the reader can expect from them.",
      },
      {
        type: "team",
        heading: "The team",
        people: [
          {
            name: "REPLACE — a name",
            role: "REPLACE — their title, or delete this line",
            bio:
              "REPLACE — two or three sentences. Add a photograph above, or " +
              "leave it and the card shows their initials.",
          },
          {
            name: "REPLACE — a second name",
            role: "REPLACE — their title",
            bio: "REPLACE — two or three sentences.",
          },
          {
            name: "REPLACE — a third name",
            role: "REPLACE — their title",
            bio: "REPLACE — two or three sentences, or remove this person.",
          },
        ],
      },
      {
        type: "callToAction",
        heading: "REPLACE — an invitation to get in touch",
        lede: "REPLACE — one line on what happens when they do, or delete this line.",
        cta: {
          label: "Get in touch",
          href: "/contact",
          variant: "primary",
        },
      },
    ],
  },
  {
    id: "recap",
    label: "Event recap",
    description:
      "After an event: how it went, what people said, and the next one. Add a gallery block for the photographs.",
    intro: "REPLACE — the event and the date, e.g. “The Spring Gala, 14 April”.",
    blocks: [
      {
        type: "richText",
        eyebrow: "REPLACE — the headline number, e.g. “$84,000 raised”",
        heading: "REPLACE — how the night went, in one line",
        body:
          "REPLACE — the story of the evening in two or three paragraphs: the " +
          "room, the moment it turned, what the money does now.\n\n" +
          "REPLACE — then add a Gallery block below this one for the " +
          "photographs. Templates cannot choose photographs for you, so it is " +
          "not here yet.",
      },
      {
        type: "testimonials",
        heading: "What people said",
        items: [
          {
            quote: "REPLACE — something a guest or an organiser actually said.",
            author: "REPLACE — their name",
            role: "REPLACE — who they are, e.g. “Gala chair”",
            rating: 5,
          },
          {
            quote: "REPLACE — a second quote, or remove this one.",
            author: "REPLACE — their name",
            role: "REPLACE — who they are",
            rating: 5,
          },
        ],
      },
      {
        type: "callToAction",
        heading: "REPLACE — the next event, or a thank-you",
        lede: "REPLACE — one line, or delete this line.",
        cta: {
          label: "Plan your next auction",
          href: "/contact",
          variant: "primary",
        },
      },
    ],
  },
  {
    id: "thanks",
    label: "Thank-you page",
    description:
      "For donors and guests after the fact: the thanks, what it made possible, and what people said.",
    intro: "REPLACE — one line: thank you, and for what.",
    blocks: [
      {
        type: "richText",
        heading: "REPLACE — thank you, in your own words",
        body:
          "REPLACE — who gave, what it adds up to, and what it makes possible. " +
          "Be specific: a number and a thing beats a paragraph of gratitude.",
        align: "centre",
      },
      {
        type: "testimonials",
        heading: "REPLACE — a heading for the quotes, e.g. “In their words”",
        items: [
          {
            quote: "REPLACE — a line from someone the money helped, or from a donor.",
            author: "REPLACE — their name",
            role: "REPLACE — who they are",
            rating: 5,
          },
        ],
      },
      {
        type: "callToAction",
        heading: "REPLACE — one way to stay involved",
        lede: "REPLACE — one line, or delete this line.",
        cta: {
          label: "See the items",
          href: "/auction-items",
          variant: "primary",
        },
      },
    ],
  },
  {
    id: "stories",
    label: "Success stories",
    description:
      "A page of results: what organisers said, what they raised, and a way to ask for the same.",
    intro: "REPLACE — one line on who these organisations are.",
    blocks: [
      {
        type: "richText",
        heading: "REPLACE — the result, in one line",
        body:
          "REPLACE — a short paragraph on the kind of organisation and the " +
          "kind of night, so the quotes below have a setting.",
        align: "centre",
      },
      {
        type: "testimonials",
        heading: "REPLACE — a heading, e.g. “From the organisers”",
        items: [
          {
            quote: "REPLACE — what an organiser said about the night.",
            author: "REPLACE — their name",
            role: "REPLACE — their role and organisation",
            rating: 5,
          },
          {
            quote: "REPLACE — a second organiser.",
            author: "REPLACE — their name",
            role: "REPLACE — their role and organisation",
            rating: 5,
          },
          {
            quote: "REPLACE — a third, or remove this one.",
            author: "REPLACE — their name",
            role: "REPLACE — their role and organisation",
            rating: 5,
          },
        ],
      },
      {
        type: "enquiryForm",
        heading: "Ask for the same",
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

/**
 * Gives a template's blocks the ids the schema requires.
 *
 * Ids are minted rather than written into the template because a template is
 * reused: two pages created from one would otherwise carry identical block
 * ids, and coercion matches a submitted block to its stored self BY ID. Two
 * blocks sharing an id is precisely the case that lets one block's protected
 * values land on another.
 *
 * The same applies one level down, to a questions block's entries, a call to
 * action's button, a testimonials block's cards and a team block's people —
 * every entry that carries an id of its own.
 *
 * IT LIVES HERE BECAUSE THREE CALLERS NEED IT. The create action performs it,
 * the template picker's thumbnails need real blocks to draw (a template block
 * will not parse without an id, and an unparsed block is one the picture
 * silently leaves out), and `check:custom-pages` validates every template
 * through it. It cannot live with the action — that module is `"use server"`,
 * so it may only export async functions — which is how the first two copies
 * came to exist. `withFreshId` is not this: that one REPLACES ids on a value
 * that already has them, which a template deliberately does not.
 */
export function withTemplateIds(blocks: TemplateBlock[]): unknown[] {
  const mint = (prefix: string) =>
    `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

  return blocks.map((block) => {
    const built: Record<string, unknown> = { ...block, id: mint("block") };
    if (block.type === "questions") {
      built.items = block.items.map((item) => ({ ...item, id: mint("q") }));
    }
    if (block.type === "callToAction") {
      built.cta = { ...block.cta, id: mint("cta") };
    }
    if (block.type === "testimonials") {
      built.items = block.items.map((item) => ({ ...item, id: mint("t") }));
    }
    if (block.type === "team") {
      built.people = block.people.map((person) => ({ ...person, id: mint("p") }));
    }
    return built;
  });
}
