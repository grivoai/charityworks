import type { SiteContent } from "@/content/types";

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

  if (contact && typeof contact.phone === "string") {
    contact.phoneHref = derivePhoneHref(
      contact.phone,
      typeof contact.phoneHref === "string" ? contact.phoneHref : ""
    );
  }

  return document;
}

/** Narrowing helper for the check script, which works in `unknown`. */
export function asSite(value: unknown): SiteContent {
  return value as SiteContent;
}
