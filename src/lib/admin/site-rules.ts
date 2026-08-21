import type { SiteContent } from "@/content/types";
import { slugify, uniqueSlug } from "@/lib/admin/slug";

/**
 * Rules the site settings schema cannot state.
 *
 * Lives here rather than inside `site-actions.ts` for the same reason
 * `applyContactFormRules` lives in `form-write.ts`: a `"use server"` module may
 * only export async functions, so a rule defined inside one cannot be imported
 * by a test. A rule nothing can check is a rule that quietly stops holding.
 */

/**
 * The `tel:` the footer's phone number dials, derived from the number itself.
 *
 * Strips everything that is not a digit and keeps a leading `+` if one was
 * typed: "(925) 250-6968" becomes "tel:9252506968", and "+44 20 7946 0958"
 * becomes "tel:+442079460958".
 *
 * The failure this removes is silent and expensive. The two fields are separate
 * strings in the schema, so before this an edit could change the number printed
 * in the footer and leave the link beside it dialling the old one — the site
 * looks right, and every tap on it reaches the wrong phone.
 *
 * A number with no digits at all would produce a bare "tel:", so the stored
 * value is kept instead: an unusable link nobody asked for is worse than a
 * stale one, which at least still rings somewhere.
 */
export function derivePhoneHref(phone: string, fallback: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return digits ? `tel:${plus}${digits}` : fallback;
}

/**
 * Gives a newly added contact channel an id.
 *
 * `contact.channels[].id` is locked in the editor because an existing row's id
 * must not change — but a row that has just been added has no id to keep, and
 * coercion had nothing in storage to restore it from. The result was an "Add
 * channel" button that appended a row nobody could fill in and no save would
 * accept: `contact.channels.3.id: expected string to have >=1 characters`,
 * every time, with no field on screen to fix it.
 *
 * So the server assigns one, from the label the client did type. Exactly what
 * `applyContactFormRules` does for a newly added question, for exactly the same
 * reason — a key the client should never have to invent, and must not be able
 * to change afterwards.
 *
 * Existing rows are returned untouched: an id is only ever minted for a row
 * that has none, so this can never renumber the channels already in place.
 */
function assignChannelIds(contact: Record<string, unknown>): void {
  const channels = contact.channels;
  if (!Array.isArray(channels)) return;

  const taken = new Set(
    channels
      .map((channel) =>
        channel && typeof channel === "object"
          ? String((channel as Record<string, unknown>).id ?? "")
          : ""
      )
      .filter((id) => id !== "")
  );

  for (const channel of channels) {
    if (!channel || typeof channel !== "object") continue;
    const row = channel as Record<string, unknown>;
    if (typeof row.id === "string" && row.id !== "") continue;

    const label = typeof row.label === "string" ? row.label : "";
    const base = `channel-${slugify(label, "new")}`;
    const id = uniqueSlug(base, taken);
    // Falling back to a timestamp rather than failing the save: two hundred
    // channels called the same thing is not a situation worth an error page.
    row.id = id ?? `channel-${Date.now().toString(36)}`;
    taken.add(String(row.id));
  }
}

/**
 * Gives a newly added navigation link an id.
 *
 * Same rule and same reason as `assignChannelIds`: the id is locked so the
 * client never has to invent one and cannot change one, which leaves a brand
 * new row with nothing in it and no way to fill it. Derived from the label,
 * deduped, and only ever minted for a row that has none.
 */
function assignNavIds(document: Record<string, unknown>): void {
  const nav = document.nav;
  if (!Array.isArray(nav)) return;

  const taken = new Set(
    nav
      .map((link) =>
        link && typeof link === "object"
          ? String((link as Record<string, unknown>).id ?? "")
          : ""
      )
      .filter((id) => id !== "")
  );

  for (const link of nav) {
    if (!link || typeof link !== "object") continue;
    const row = link as Record<string, unknown>;
    if (typeof row.id === "string" && row.id !== "") continue;

    const label = typeof row.label === "string" ? row.label : "";
    const id = uniqueSlug(`nav-${slugify(label, "link")}`, taken);
    row.id = id ?? `nav-${Date.now().toString(36)}`;
    taken.add(String(row.id));
  }
}

/**
 * Applies every site rule to a coerced document, in place.
 *
 * Runs AFTER coercion, because coercion is what restores locked values from
 * storage — and `contact.phoneHref` is locked precisely so that this is the
 * only thing that ever sets it.
 */
export function applySiteRules(coerced: unknown): unknown {
  if (!coerced || typeof coerced !== "object") return coerced;

  const document = coerced as Record<string, unknown>;
  const contact = document.contact as Record<string, unknown> | undefined;

  if (contact) {
    if (typeof contact.phone === "string") {
      contact.phoneHref = derivePhoneHref(
        contact.phone,
        typeof contact.phoneHref === "string" ? contact.phoneHref : ""
      );
    }
    assignChannelIds(contact);
  }

  assignNavIds(document);

  return document;
}

/** Narrowing helper for the check script, which works in `unknown`. */
export function asSite(value: unknown): SiteContent {
  return value as SiteContent;
}
