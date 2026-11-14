import { pageSchemas } from "@/content/schema";
import type { PageSlug } from "@/content/types";
import {
  HIDDEN_PAGE_LABELS,
  HIDDEN_PAGE_PATHS,
  hiddenPageSchemas,
  isHiddenPageSlug,
  type HiddenPageSlug,
} from "@/content/hidden-pages";

/**
 * Facts about the eight pages that both the editor routes and the save action
 * need: what to call them, where they render, and whether a string is one.
 *
 * Deliberately free of database access so it can be imported from anywhere,
 * including the `"use server"` action file, which may only export async
 * functions.
 */

/** Short names for navigation. The page's own heading is usually a sentence. */
export const PAGE_LABELS: Record<PageSlug, string> = {
  home: "Home",
  "auction-info": "How auctions work",
  "auction-items": "Auction items",
  "auction-planner": "Auction planner",
  auctioneers: "Auctioneers",
  faqs: "Questions",
  testimonials: "Testimonials",
  contact: "Contact",
};

/** The order they appear in the site's navigation, which is the order to list them in. */
export const PAGE_ORDER: PageSlug[] = [
  "home",
  "auction-items",
  "auction-info",
  "auction-planner",
  "auctioneers",
  "testimonials",
  "faqs",
  "contact",
];

export const PAGE_PATHS: Record<PageSlug, string> = {
  home: "/",
  "auction-info": "/auction-info",
  "auction-items": "/auction-items",
  "auction-planner": "/auction-planner",
  auctioneers: "/auctioneers",
  faqs: "/faqs",
  testimonials: "/testimonials",
  contact: "/contact",
};

export function isPageSlug(value: unknown): value is PageSlug {
  return typeof value === "string" && value in pageSchemas;
}

/**
 * Every page the "Page text" editor can open: the eight built-in pages and the
 * three hidden ones. The hidden ones are kept out of `PageSlug` so the sitemap,
 * /llms.txt and the nav-link picker never see them (see hidden-pages.ts); the
 * editor, the save action and the history take this wider type instead.
 */
export type EditableSlug = PageSlug | HiddenPageSlug;

export function isEditableSlug(value: unknown): value is EditableSlug {
  return isPageSlug(value) || isHiddenPageSlug(value);
}

/** The schema that validates and draws the form for an editable page. */
export function schemaFor(slug: EditableSlug) {
  return isHiddenPageSlug(slug) ? hiddenPageSchemas[slug] : pageSchemas[slug];
}

export const EDITABLE_LABELS: Record<EditableSlug, string> = {
  ...PAGE_LABELS,
  ...HIDDEN_PAGE_LABELS,
};

export const EDITABLE_PATHS: Record<EditableSlug, string> = {
  ...PAGE_PATHS,
  ...HIDDEN_PAGE_PATHS,
};

/** "3 minutes ago" for recent edits, an absolute date once that stops being useful. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "never edited";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "unknown";

  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  return then.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Date and time, for the history list where the exact moment matters.
 *
 * Seconds included deliberately: several saves inside one minute are normal
 * while wording is being worked on, and without them the list shows a column of
 * identical labels with no way to tell which version is which.
 */
export function formatExact(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
