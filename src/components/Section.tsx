import Link from "next/link";
import type { CtaRef, SectionHeader as SectionHeaderData } from "@/content/types";

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
}: {
  cta: CtaRef;
  onDark?: boolean;
}) {
  return (
    <Link href={cta.href} className={ctaClassName(cta.variant, onDark)}>
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
}: {
  header: SectionHeaderData;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <>
      {header.eyebrow && <span className="eyebrow reveal">{header.eyebrow}</span>}
      <Tag className={Tag === "h1" ? "reveal" : "section-title reveal"}>
        {header.title}
      </Tag>
      {header.lede && <p className="section-lede reveal">{header.lede}</p>}
    </>
  );
}
