import type { Testimonial } from "@/content/types";

/**
 * A single testimonial. `duplicate` marks the copy that exists only to complete
 * the marquee loop; it is hidden from assistive technology and crawlers.
 */
export function TestimonialCard({
  testimonial,
  duplicate = false,
}: {
  testimonial: Testimonial;
  duplicate?: boolean;
}) {
  return (
    <figure className="t-card" aria-hidden={duplicate || undefined}>
      <div className="t-stars" aria-hidden="true">
        {"★".repeat(testimonial.rating)}
      </div>
      {!duplicate && (
        <span className="sr-only">{testimonial.rating} out of 5 stars.</span>
      )}
      <blockquote className="t-quote">{testimonial.quote}</blockquote>
      <figcaption>
        <div className="t-author">{testimonial.author}</div>
        <div className="t-role">{testimonial.role}</div>
      </figcaption>
    </figure>
  );
}
