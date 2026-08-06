import Link from "next/link";
import type { CtaRef, SectionHeader as SectionHeaderData } from "@/content/types";
import { at, editable } from "@/lib/editable";

/** Maps a content-layer button variant onto the stylesheet's button classes. */
export function ctaClassName(variant: CtaRef["variant"], onDark = true): string {
  switch (variant) {
    case "primary":
      return "btn btn-gold";
    case "solid":
      return "btn btn-green";
    case "secondary":
      return `btn btn-quiet${onDark ? "" : " btn-quiet-dark"}`;
  }
}

/**
 * A content-driven call to action.
 * Secondary CTAs get a trailing arrow to carry affordance without the visual
 * weight of a filled button.
 */
export function Cta({
  cta,
  onDark = true,
  path,
}: {
  cta: CtaRef;
  onDark?: boolean;
  /**
   * Where this CTA sits in the page document, e.g. `"cta"` or
   * `"process.cta"`. Omitted when the button is not page content, in which
   * case nothing is marked and it is not clickable in the admin preview.
   */
  path?: string;
}) {
  return (
    <Link
      href={cta.href}
      className={ctaClassName(cta.variant, onDark)}
      // The label, not the whole CTA: `href` and `variant` are not visible as
      // text, so they stay in the form and are listed in visual-map.ts.
      {...editable(at(path, "label"))}
    >
      {cta.label}
      {cta.variant === "secondary" && (
        <span className="arrow" aria-hidden="true">
          →
        </span>
      )}
    </Link>
  );
}

/**
 * The eyebrow / heading / lede trio that opens most sections.
 * `as` controls the heading level so each page keeps a clean outline.
 */
export function SectionHeading({
  header,
  as: Tag = "h2",
  path,
}: {
  header: SectionHeaderData;
  as?: "h1" | "h2" | "h3";
  /** Where this header sits in the page document, e.g. `"why.header"`. */
  path?: string;
}) {
  return (
    <>
      {header.eyebrow && (
        <span className="eyebrow reveal" {...editable(at(path, "eyebrow"))}>
          {header.eyebrow}
        </span>
      )}
      <Tag
        className={Tag === "h1" ? "reveal" : "section-title reveal"}
        {...editable(at(path, "title"))}
      >
        {header.title}
      </Tag>
      {header.lede && (
        <p className="section-lede reveal" {...editable(at(path, "lede"))}>
          {header.lede}
        </p>
      )}
    </>
  );
}
