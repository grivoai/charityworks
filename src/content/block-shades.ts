import type { PageBlock } from "@/content/schema";

/**
 * Which blocks end up shaded, and which stay on paper.
 *
 * Lifted out of `PageBlocks` when the template picker needed to draw the same
 * banding in miniature. The rule is not obvious enough to reimplement twice —
 * an automatic block contrasts with whatever RESOLVED before it, not with its
 * own index — and a thumbnail whose stripes disagree with the page it is
 * advertising is worse than a thumbnail with no stripes at all.
 *
 * Type-only import, so this module carries no runtime dependency on the schema
 * and can be read from anywhere without dragging zod along behind it.
 */

export type Shade = "paper" | "cream";

/** A block carrying the layout controls, as against the two self-painting bands. */
export type LaidBlock = Extract<PageBlock, { background: Shade | "auto" }>;

/**
 * Structural rather than a list of type names.
 *
 * Read off the schema's own shape, so a block type added later is laid out the
 * moment it declares a background — there is no second list to remember to add
 * it to, and no way for that list to be wrong.
 */
export const isLaid = (block: PageBlock): block is LaidBlock =>
  "background" in block;

/**
 * What one block asks for.
 *
 * `null` is not "no opinion" — it is a block that paints its own band and takes
 * no shade from this at all, while still TAKING ITS TURN in the alternation.
 * Dropping those from the list would shift every block after them.
 */
export type ShadeIntent = Shade | "auto" | null;

/**
 * Resolves a page's shading, in order.
 *
 * Returns one entry per intent: the shade to paint, or `null` for a block that
 * paints itself. Starts on cream so the first automatic block lands on paper,
 * which is what pages built before the layout controls existed already do.
 */
export function resolveShades(intents: ShadeIntent[]): (Shade | null)[] {
  const out: (Shade | null)[] = [];
  let previous: Shade = "cream";

  for (const intent of intents) {
    const next: Shade =
      intent && intent !== "auto"
        ? intent
        : previous === "cream"
          ? "paper"
          : "cream";

    out.push(intent === null ? null : next);
    previous = next;
  }

  return out;
}

/** The shade each block paints, by index. `null` where the block paints itself. */
export function shadeBlocks(blocks: PageBlock[]): (Shade | null)[] {
  return resolveShades(
    blocks.map((block) => (isLaid(block) ? block.background : null))
  );
}
