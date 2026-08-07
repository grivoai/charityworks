import type { Testimonial } from "@/content/types";
import { at, editable } from "@/lib/editable";

/**
 * A single testimonial. `duplicate` marks the copy that exists only to complete
 * the marquee loop; it is hidden from assistive technology and crawlers.
 */
export function TestimonialCard({
  testimonial,
  duplicate = false,
  path,
}: {
  testimonial: Testimonial;
  duplicate?: boolean;
  /**
   * Where this testimonial sits in the page document, e.g.
   * `"testimonials.2"`. Omitted by the marquee, whose duplicated copies would
   * otherwise give two elements the same field.
   */
  path?: string;
}) {
  return (
    <figure className="t-card" aria-hidden={duplicate || undefined}>
      <div className="t-stars" aria-hidden="true" {...editable(at(path, "rating"))}>
        {"★".repeat(testimonial.rating)}
      </div>
      {!duplicate && (
        <span className="sr-only">{testimonial.rating} out of 5 stars.</span>
      )}
      <blockquote className="t-quote" {...editable(at(path, "quote"))}>
        {testimonial.quote}
      </blockquote>
      <figcaption>
        <div className="t-author" {...editable(at(path, "author"))}>
          {testimonial.author}
        </div>
        <div className="t-role" {...editable(at(path, "role"))}>
          {testimonial.role}
        </div>
      </figcaption>
    </figure>
  );
}
