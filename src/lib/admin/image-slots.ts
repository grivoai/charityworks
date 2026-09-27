import { matchesPattern } from "@/lib/admin/locks";

/**
 * The shape each picture is shown in, so the cropper can offer it.
 *
 * A photograph is uploaded on a form and shown in a frame the form cannot
 * see: a lot's picture sits inside a 4:3 card, a team member's in a square,
 * a category's across a tile that crops its edges. The client's uploads
 * arrive in every shape a phone produces — 510×280 and 335×417 in the same
 * week — and the site shows each however it was, which is the complaint this
 * answers. The cropper opens on the slot's shape, says what the shape is for,
 * and leaves the choice with the person who can see the photograph.
 *
 * Keyed by field path, the same dotted form with `*` for indices that the
 * lock rules use, and matched the same way. A path with no entry is a slot
 * shown at the picture's own shape (a logo, a photograph beside text), where
 * there is nothing to fit and the cropper opens on the picture as it is.
 *
 * Data rather than a function because it is serialised into the field tree
 * for the browser to read. Deliberately free of `server-only`.
 */

export interface ImageSlot {
  /** Where it is shown, worded for the client: "Lot card". */
  label: string;
  /** Width ÷ height of the frame it fills. */
  aspect: number;
  /** One line on what the frame does with the picture. */
  hint: string;
}

const SLOTS: Array<{ pattern: string; slot: ImageSlot }> = [
  {
    // The catalog editor's top-level image: the category tile. The tile's
    // shape changes with the screen — wide on a desktop grid, a single band
    // on a phone — and always crops toward the middle, so what the cropper
    // can usefully do is set a landscape frame and say where to put the
    // subject.
    pattern: "image",
    slot: {
      label: "Category tile",
      aspect: 3 / 2,
      hint:
        "The tile crops the edges to fit its space, which changes with the " +
        "screen. Keep the subject in the middle.",
    },
  },
  {
    // A group's tile in the section picker at the top of a category page.
    // Wide on a desktop, a panel beside the words on a phone — so, like the
    // category tile, the useful thing the cropper can do is set a landscape
    // frame and say that the edges go.
    pattern: "groups.*.coverImage",
    slot: {
      label: "Section tile",
      aspect: 16 / 9,
      hint:
        "A wide band above the section's name, and a panel beside it on a " +
        "phone. It crops the edges to fill, so keep the subject in the middle.",
    },
  },
  {
    pattern: "groups.*.items.*.image",
    slot: {
      label: "Lot card",
      aspect: 4 / 3,
      hint:
        "Shown whole inside a 4:3 frame — a picture of another shape gets a " +
        "band either side. This shape fills it.",
    },
  },
  {
    pattern: "auctioneers.*.image",
    slot: {
      label: "Auctioneer portrait",
      aspect: 4 / 5,
      hint: "A tall frame, anchored to the top. Keep the face in the upper part.",
    },
  },
  {
    pattern: "blocks.*.images.*.image",
    slot: {
      label: "Gallery tile",
      aspect: 4 / 3,
      hint:
        "Every tile in a gallery is the same 4:3 shape, cropped toward the " +
        "upper third.",
    },
  },
  {
    pattern: "blocks.*.people.*.photo",
    slot: {
      label: "Team portrait",
      aspect: 1,
      hint: "A square, anchored to the top. Keep the face in the upper part.",
    },
  },
];

/** The slot a field path is shown in, or null when it shows the picture as it is. */
export function slotFor(path: string): ImageSlot | null {
  return SLOTS.find((entry) => matchesPattern(path, entry.pattern))?.slot ?? null;
}

/** For the check script: every pattern, so each can be proved to match a field. */
export const SLOT_PATTERNS = SLOTS.map((entry) => entry.pattern);
