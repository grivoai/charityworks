import "server-only";

import type { ZodType } from "zod";
import type {
  ArrayNode,
  FieldNode,
  ObjectNode,
  StringNode,
} from "@/lib/admin/field-node";
import { findLock, findRule, type LockRule } from "@/lib/admin/locks";

/**
 * Turns a Zod schema into a tree of plain field descriptions the admin can render.
 *
 * The point of this file is that there is one description of the content model.
 * `src/content/schema.ts` already says a testimonial has a quote, an author, a
 * role and a 1–5 rating, and already carries the help text for each. Writing
 * that out a second time as a hand-built form would create two descriptions that
 * agree today and drift the first time someone adds a field to one of them.
 *
 * This is the ONLY module that reaches into Zod's internals. They are not a
 * stable public API, so the reaching is contained here, behind a shape derived
 * from a probe of the installed version (Zod 4.4.3) rather than from memory:
 *
 *   .def.type    discriminates: string, number, boolean, enum, literal, union,
 *                array, object, record, optional, pipe
 *   .description the `.describe()` text, readable on the outermost wrapper
 *   .def.shape   an object's fields          .def.element   an array's element
 *   .def.entries an enum's values            .def.values    a literal's values
 *   .def.innerType  what an optional wraps   .def.in / .out a pipe's ends
 *   .def.format  "email" | "url" on the string subtypes
 *
 * If a future Zod moves these, this file breaks loudly at build time — every
 * page's form comes through here — rather than silently rendering nothing.
 */

/* Zod's internals are untyped from outside. Confined to this file. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Internal = any;

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/** Keys whose English name is not just the camelCase split. */
const LABELS: Record<string, string> = {
  seo: "Search engine listing",
  cta: "Button",
  ctaRef: "Button",
  faqs: "Questions",
  lede: "Lede",
  sub: "Supporting line",
  url: "Web address",
  href: "Links to",
  src: "Image file",
  alt: "Alt text",
  id: "Identifier",
  eyebrow: "Eyebrow",
  blurb: "Short description",
  intro: "Introduction",
  bio: "Biography",
  targetTerms: "Target search terms",
  headingLead: "Heading, first line",
  headingAccent: "Heading, second line",
  primaryCta: "Main button",
  secondaryCta: "Secondary button",
  itemsTeaser: "Catalog section",
  testimonialsTeaser: "Testimonials section",
  mobileBidding: "Mobile bidding",
  mobileNote: "Mobile note",
  rosterHeading: "Roster heading",
  auctioneerCard: "Auctioneer card",
  submitLabel: "Submit button",
  successMessage: "Message after sending",
  errorMessage: "Message if sending fails",
  answersLabel: "Answers label",
  picksHeading: "Picks heading",
  generalOnly: "No named lots",
  maxChoices: "Maximum choices",
  summaryLabel: "Summary label",
};

/** `headingAccent` becomes "Heading accent"; known keys use the table above. */
export function humanize(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase()
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Which fields get a textarea.
 *
 * Decided from the key, not from how long the current value happens to be — a
 * form that changes shape depending on what is already typed in it is
 * disorienting, and would reshape itself after a save.
 */
const MULTILINE_KEYS = new Set([
  "body",
  "bio",
  "intro",
  "lede",
  "description",
  "answer",
  "quote",
  "blurb",
  "detail",
  "note",
  "sub",
  "message",
  "successmessage",
  "errormessage",
  "positioning",
  "help",
  "strapline",
  "closer",
  "reward",
]);

/* ------------------------------------------------------------------ */
/* Unwrapping                                                          */
/* ------------------------------------------------------------------ */

interface Unwrapped {
  inner: Internal;
  optional: boolean;
  description?: string;
}

/**
 * Peels optional/default/pipe wrappers off to reach the schema that describes
 * the shape.
 *
 * `optionalText` in the content schema is
 * `z.string().trim().transform(...).optional()`, which is
 * ZodOptional → ZodPipe → { in: ZodString, out: ZodTransform }. The description
 * sits on the outermost wrapper, so it is collected on the way down.
 */
function unwrap(schema: Internal): Unwrapped {
  let current = schema;
  let optional = false;
  let description: string | undefined = schema?.description;

  for (let guard = 0; guard < 12; guard += 1) {
    const type = current?.def?.type;
    if (type === "optional" || type === "nullable" || type === "default") {
      optional = true;
      current = current.def.innerType;
    } else if (type === "pipe") {
      // Validate against the input side: that is the shape being typed in.
      current = current.def.in;
    } else {
      break;
    }
    description = description ?? current?.description;
  }

  return { inner: current, optional, description };
}

function checkNames(schema: Internal): string[] {
  return (schema?.def?.checks ?? []).map(
    (c: Internal) => c?._zod?.def?.check ?? c?.check ?? ""
  );
}

function checkValue(schema: Internal, name: string): number | undefined {
  for (const c of schema?.def?.checks ?? []) {
    const def = c?._zod?.def ?? c;
    if ((def?.check ?? "") === name && typeof def?.value === "number") {
      return def.value;
    }
  }
  return undefined;
}

/** `{ src, alt, width?, height? }` and nothing else. */
function isImageShape(shape: Record<string, Internal> | undefined): boolean {
  if (!shape) return false;
  const keys = Object.keys(shape);
  const allowed = new Set(["src", "alt", "width", "height"]);
  return (
    keys.includes("src") &&
    keys.includes("alt") &&
    keys.every((k) => allowed.has(k))
  );
}

/* ------------------------------------------------------------------ */
/* Derivation                                                          */
/* ------------------------------------------------------------------ */

interface Context {
  /** Key this schema sits under, used for the label and the textarea rule. */
  key?: string;
  /** Dotted path with `*` for array indices, matched against the lock rules. */
  shapePath: string;
  locks: LockRule[];
}

function toNode(schema: Internal, ctx: Context): FieldNode {
  const { inner, optional, description } = unwrap(schema);
  const type = inner?.def?.type;
  const label = ctx.key ? humanize(ctx.key) : "";
  const locked = findLock(ctx.shapePath, "readonly", ctx.locks);

  /**
   * An entry's `id` is machinery, not content: it exists so two entries can be
   * told apart, and it is what React keys and links point at. Editing one has
   * no visible effect and a duplicate breaks the list, so it is carried through
   * every save untouched and never drawn.
   */
  const structural = ctx.key === "id";

  const base = {
    label,
    description,
    optional,
    ...(locked ? { locked } : {}),
    ...(structural ? { hideInForm: true } : {}),
  };

  switch (type) {
    case "string": {
      const format = inner.def?.format;
      const node: StringNode = {
        ...base,
        kind: "string",
        multiline: MULTILINE_KEYS.has((ctx.key ?? "").toLowerCase()),
        required: !optional && checkNames(inner).includes("min_length"),
        ...(format === "email" || format === "url" ? { format } : {}),
      };
      return node;
    }

    case "number":
      return {
        ...base,
        kind: "number",
        min: checkValue(inner, "greater_than"),
        max: checkValue(inner, "less_than"),
      };

    case "boolean":
      return { ...base, kind: "boolean" };

    case "enum":
      return {
        ...base,
        kind: "enum",
        values: Object.values(inner.def.entries ?? {}) as string[],
      };

    case "literal":
      // A page's slug. Fixed by which page this is; preserved, never shown.
      return { ...base, kind: "hidden", value: inner.def.values?.[0] };

    case "object": {
      const shape = inner.def.shape as Record<string, Internal>;

      if (isImageShape(shape)) {
        return { ...base, kind: "image" };
      }

      const node: ObjectNode = {
        ...base,
        kind: "object",
        fields: Object.entries(shape).map(([key, child]) => ({
          key,
          node: toNode(child, {
            key,
            shapePath: ctx.shapePath ? `${ctx.shapePath}.${key}` : key,
            locks: ctx.locks,
          }),
        })),
      };
      return node;
    }

    case "array": {
      const elementPath = ctx.shapePath ? `${ctx.shapePath}.*` : "*";
      const element = toNode(inner.def.element, {
        // Element inherits the array's key so `bio` entries read as paragraphs
        // and pick up the same textarea rule.
        key: ctx.key,
        shapePath: elementPath,
        locks: ctx.locks,
      });
      const fixedLength = findLock(ctx.shapePath, "fixed-length", ctx.locks);
      const protectRule = findRule(ctx.shapePath, "protected-entries", ctx.locks);
      const protect =
        protectRule?.key && protectRule.values
          ? {
              key: protectRule.key,
              values: [...protectRule.values],
              reason: protectRule.reason,
            }
          : undefined;
      const node: ArrayNode = {
        ...base,
        kind: "array",
        element,
        template: blankFor(element),
        ...(fixedLength ? { fixedLength } : {}),
        ...(protect ? { protect } : {}),
      };
      return node;
    }

    /**
     * `z.union([z.literal(""), z.url()])` — the booking link, where empty is a
     * meaningful value that switches the widget off. Treated as an optional web
     * address, which is exactly how it behaves.
     */
    case "union": {
      const options = (inner.def.options ?? []) as Internal[];

      /**
       * A DISCRIMINATED union — the shape a list of page blocks takes.
       *
       * Zod reports these as `type: "union"` like any other, with the deciding
       * field's name in `def.discriminator`; that is the only thing separating
       * them from the loose union handled below.
       *
       * Each option becomes an ordinary ObjectNode, discriminator and all. That
       * is deliberate and is what keeps the change small: coercion, locks,
       * validation and error paths all keep walking objects, and the only new
       * question anywhere is *which* object. The discriminator lands as a
       * `hidden` node via the literal case, so it survives a save without being
       * drawn as an editable field — the same treatment a page's slug gets.
       */
      const discriminator = inner.def.discriminator as string | undefined;
      if (discriminator) {
        const variants = options.map((option) => {
          const shape = (option.def?.shape ?? {}) as Record<string, Internal>;
          const literal = shape[discriminator];
          const value = String(literal?.def?.values?.[0] ?? "");
          const node = toNode(option, {
            ...ctx,
            // The option's own label would repeat the list's; what the picker
            // needs is the name of THIS shape.
            key: value,
          }) as ObjectNode;
          return {
            value,
            label: humanize(value),
            node,
            template: blankFor(node),
          };
        });

        // A union whose options are not all objects with the literal present is
        // not something this can draw, and guessing would be worse than saying
        // so — the opaque fallback below already says it properly.
        if (variants.every((v) => v.value !== "" && v.node.kind === "object")) {
          return {
            ...base,
            kind: "variant",
            discriminator,
            options: variants,
          };
        }
      }

      const hasEmptyLiteral = options.some(
        (o) => o?.def?.type === "literal" && o?.def?.values?.[0] === ""
      );
      const stringOption = options.find((o) => o?.def?.type === "string");
      if (hasEmptyLiteral && stringOption) {
        return {
          ...base,
          kind: "string",
          multiline: false,
          required: false,
          optional: true,
          ...(stringOption.def?.format === "url" ? { format: "url" as const } : {}),
        };
      }
      return {
        ...base,
        kind: "opaque",
        reason: "This field has a shape the editor cannot show yet.",
      };
    }

    default:
      // `record` (the planner's category weights) lands here. Nothing on a page
      // uses one today; showing it read-only beats dropping it on save.
      return {
        ...base,
        kind: "opaque",
        reason: `This field (${String(type)}) has to be edited in code for now.`,
      };
  }
}

/* ------------------------------------------------------------------ */
/* Blanks                                                              */
/* ------------------------------------------------------------------ */

/**
 * A new, empty value shaped like the node.
 *
 * Optional objects and arrays are left out, so a new auctioneer has no
 * photograph rather than an empty one. Optional scalars are included as empty
 * strings, because for those "cleared" and "absent" are the same intent and an
 * empty input says so more clearly than a button that adds a field.
 */
export function blankFor(node: FieldNode): unknown {
  switch (node.kind) {
    /**
     * The first option, which is therefore the one an "Add" lands on. Schema
     * order is the authoring order, so the block a page most often opens with
     * should be declared first.
     */
    case "variant":
      return node.options[0] ? node.options[0].template : {};

    case "string":
      return "";
    case "number":
      // Empty rather than zero: a rating of 0 would be a claim, and this is the
      // absence of one. Validation then asks for a real value on save.
      return "";
    case "boolean":
      return false;
    case "enum":
      return node.values[0] ?? "";
    case "hidden":
      return node.value;
    case "image":
      return { src: "", alt: "" };
    case "array":
      return [];
    case "object": {
      const out: Record<string, unknown> = {};
      for (const { key, node: child } of node.fields) {
        const skip =
          child.optional &&
          (child.kind === "object" ||
            child.kind === "image" ||
            child.kind === "array");
        if (!skip) out[key] = blankFor(child);
      }
      return out;
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/** The editable tree for a schema. Always an object at the root. */
export function buildFieldTree(schema: ZodType, locks: LockRule[]): ObjectNode {
  const node = toNode(schema as Internal, { shapePath: "", locks });
  if (node.kind !== "object") {
    throw new Error(
      `[admin] expected an object schema at the root, got "${node.kind}"`
    );
  }
  return node;
}
