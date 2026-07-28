import type { Testimonial } from "@/content/types";
import { TestimonialCard } from "./TestimonialCard";

/**
 * Infinite testimonial marquee.
 *
 * The track deliberately contains the list twice — the CSS animation translates
 * it by exactly -50%, so the second copy is what makes the loop seamless rather
 * than snapping back. That duplication was intentional in the original build.
 *
 * Two changes from the original: the copy is rendered at build time instead of
 * by `track.innerHTML += track.innerHTML` on the client, and the duplicate half
 * is marked aria-hidden so screen readers and crawlers encounter each
 * testimonial exactly once.
 */
export function TestimonialMarquee({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  return (
    <div className="t-track-wrap">
      <div className="t-track" id="tTrack">
        {testimonials.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} />
        ))}
        {/* Visual duplicate that completes the seamless loop. */}
        {testimonials.map((t) => (
          <TestimonialCard key={`${t.id}-loop`} testimonial={t} duplicate />
        ))}
      </div>
    </div>
  );
}
