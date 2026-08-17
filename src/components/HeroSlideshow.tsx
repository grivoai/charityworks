import Image from "next/image";

/**
 * Cross-fading photography behind the hero.
 *
 * Deliberately CSS-only. Every slide is in the markup from the start and the
 * fade is one keyframe per layer offset by `--slide-delay`, so there is no
 * client component, no hydration and nothing that can leave the hero blank if
 * JavaScript is slow. Under `prefers-reduced-motion` the global
 * `* { animation: none }` rule freezes it on the first slide, which is a
 * perfectly good static hero — no separate handling needed.
 *
 * PLACEHOLDERS. These are catalog travel photographs standing in until real
 * event photography arrives; the list is hardcoded rather than content-managed
 * because the content source Zod-parses every page row and throws on a
 * mismatch, so adding a `hero.slides` field means migrating the live database
 * before the build. That is the right work to do for the real photographs, and
 * the wrong work to do for images we intend to throw away. When the real set
 * lands, move this list into the home page document.
 *
 * Chosen for being actual wide photographs: much of the trips folder is
 * marketing composites with burned-in price starbursts, which would look like
 * a mistake at full bleed.
 */
const SLIDES = [
  // First because it is the darkest and warmest of the five: the least jarring
  // thing to paint under the headline on a cold start, and the kindest to the
  // scrim's contrast budget.
  "/images/catalog/trips/trip_07_southern-californias-finest-destination.jpg",
  "/images/catalog/trips/trip_31_under-the-tuscany.jpg",
  "/images/catalog/trips/trip_09_waikiki-city-lights-view-room.jpg",
  "/images/catalog/trips/trip_10_oahu-hawaii.jpg",
  "/images/catalog/trips/trip_12_south-lake-tahoe-california.jpg",
];

/** Seconds each slide holds before the next one begins its fade. */
const HOLD_SECONDS = 8;

export function HeroSlideshow() {
  return (
    <div className="hero-slides" aria-hidden="true">
      {SLIDES.map((src, index) => (
        <div
          key={src}
          className="hero-slide"
          style={
            { "--slide-delay": `${index * HOLD_SECONDS}s` } as React.CSSProperties
          }
        >
          {/* Only the first is priority: it is the LCP candidate. The rest are
              left to load normally so four full-bleed photographs do not
              compete with the headline for the first paint. */}
          <Image
            src={src}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      ))}
    </div>
  );
}
