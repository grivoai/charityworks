import Image from "next/image";
import type { AuctionItem } from "@/content/types";

/**
 * Scrolling strip of catalog photography for the home page's items section.
 *
 * Built on the same trick as TestimonialMarquee: the track holds the tiles
 * twice and the animation translates by exactly half its width, so the loop is
 * seamless rather than snapping. It runs the opposite direction and slower than
 * the testimonial marquee, so the two read as a deliberate pair rather than a
 * repeated effect.
 *
 * Entirely decorative — `aria-hidden`, empty alts, no links. Every lot here is
 * already reachable through the bento tiles below it and the category pages, so
 * making the strip navigable would only add a second, worse route to the same
 * content and 28 duplicate images for a crawler to wade through.
 */
const TILE_COUNT = 14;

/**
 * Photographs cleared for the showcase, by hand.
 *
 * The catalog mixes two kinds of image under one field: photographs OF the lot,
 * and CharityWorks sales artwork standing in for it. The second kind — yellow
 * "$1500 or Less" starbursts, multi-photo collages, a tour poster, characters
 * from a theme park — is fine on a category page next to its price and
 * description, and looks like a rendering fault in a silent full-bleed strip.
 * There is no way to tell them apart from the data: same field, same folder,
 * same shape. So they were sorted by eye.
 *
 * Where the line falls: a photograph of a framed commemorative is allowed even
 * though there is text inside the frame, because the text is printed on the
 * thing being sold. A photograph with text laid over it by us is not.
 *
 * Everything in guitars/, gold-albums/ and memorabilia/ passed — those are
 * studio shots of physical goods. Of the 25 travel images in the catalog only
 * six are actual photographs; the rest are composites.
 *
 * MAINTENANCE. This is an allowlist, so a lot added in the admin will NOT
 * appear here until its photograph is added below. That is the deliberate
 * trade: the strip cannot regress on its own, and it cannot pick up new work on
 * its own either. A blocklist would invert both. If this list drifts far enough
 * out of date the strip quietly narrows rather than breaking — and if it ever
 * matches nothing, the component renders nothing rather than an empty rail.
 */
const APPROVED_IMAGES = new Set<string>([
  // Signed guitars — product shots on white.
  "/images/catalog/guitars/guitar_01_taylor-swift.jpg",
  "/images/catalog/guitars/guitar_02_morgan-wallen.jpg",
  "/images/catalog/guitars/guitar_03_ed-sheeran.jpg",
  "/images/catalog/guitars/guitar_04_luke-combs.jpg",
  "/images/catalog/guitars/guitar_05_ozzy-osbourne.jpg",
  "/images/catalog/guitars/guitar_06_bruce-springsteen.jpg",
  "/images/catalog/guitars/guitar_07_carrie-underwood.jpg",
  "/images/catalog/guitars/guitar_08_jon-bon-jovi.jpg",
  "/images/catalog/guitars/guitar_09_elton-john.jpg",
  "/images/catalog/guitars/guitar_10_taylor-swift.jpg",

  // Gold albums — framed record displays.
  "/images/catalog/gold-albums/goldalbum_01_ac-dc.jpg",
  "/images/catalog/gold-albums/goldalbum_02_beatles.jpg",
  "/images/catalog/gold-albums/goldalbum_03_blake-shelton.jpg",
  "/images/catalog/gold-albums/goldalbum_04_bruce-springsteen.jpg",
  "/images/catalog/gold-albums/goldalbum_05_carlos-santana.jpg",
  "/images/catalog/gold-albums/goldalbum_06_the-eagles-hotel-california.jpg",
  "/images/catalog/gold-albums/goldalbum_07_elvis-presley.jpg",
  "/images/catalog/gold-albums/goldalbum_08_fleetwood-mac.jpg",
  "/images/catalog/gold-albums/goldalbum_09_frank-sinatra.jpg",
  "/images/catalog/gold-albums/goldalbum_10_garth-brooks.jpg",
  "/images/catalog/gold-albums/goldalbum_11_jimmy-buffett.jpg",
  "/images/catalog/gold-albums/goldalbum_12_journey.jpg",
  "/images/catalog/gold-albums/goldalbum_13_led-zepelin.jpg",
  "/images/catalog/gold-albums/goldalbum_14_michael-jackson.jpg",
  "/images/catalog/gold-albums/goldalbum_15_pink-floyd-the-wall.jpg",
  "/images/catalog/gold-albums/goldalbum_16_prince-purple-rain.jpg",
  "/images/catalog/gold-albums/goldalbum_17_queen.jpg",
  "/images/catalog/gold-albums/goldalbum_18_rat-pack-robin-the-7-hoods.jpg",
  "/images/catalog/gold-albums/goldalbum_19_taylor-swift.jpg",
  "/images/catalog/gold-albums/goldalbum_20_the-rolling-stones.jpg",
  "/images/catalog/gold-albums/goldalbum_21_tom-petty.jpg",

  // Memorabilia — framed jerseys, commemoratives and signed prints.
  "/images/catalog/memorabilia/memorabilia_01_george-kittle-49ers-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_02_christian-mccaffrey-49ers-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_03_brock-purdy-49ers-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_04_stephen-curry-warriors-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_05_maxx-crosby-raiders-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_06_brock-bowers-raiders-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_07_buster-posey-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_08_logan-webb-giants-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_09_brandon-crawford-giants-handsigned-framed-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_10_shohei-ohtani-dodgers-handsigned-card-wframed-jers.jpg",
  "/images/catalog/memorabilia/memorabilia_11_shohei-ohtani-dodgers-5050-comm-w-handsigned-card.jpg",
  "/images/catalog/memorabilia/memorabilia_12_macklin-celebrini-sharks-handsigned-jersey.jpg",
  "/images/catalog/memorabilia/memorabilia_17_taylor-swift-handsigned-deluxe-cd-commemorative.jpg",
  "/images/catalog/memorabilia/memorabilia_18_taylor-swift-handsigned-cd-commemorative.jpg",
  "/images/catalog/memorabilia/memorabilia_19_bruce-springsteen-handsigned-deluxe-album-commemor.jpg",
  "/images/catalog/memorabilia/memorabilia_20_carlos-santana-commemorative-w-handsigned-cd.jpg",
  "/images/catalog/memorabilia/memorabilia_21_sf-giants-all-time-greats-11x14-w-posey.jpg",
  "/images/catalog/memorabilia/memorabilia_22_oakland-as-5-legendary-players-11x14-w.jpg",
  "/images/catalog/memorabilia/memorabilia_23_stephen-curry.jpg",
  "/images/catalog/memorabilia/memorabilia_24_draymond-green.jpg",
  "/images/catalog/memorabilia/memorabilia_25_warriors-all-time-greats.jpg",
  "/images/catalog/memorabilia/memorabilia_26_warriors-big-three.jpg",
  "/images/catalog/memorabilia/memorabilia_27_sf-49ers-5-stars-w-5.jpg",
  "/images/catalog/memorabilia/memorabilia_28_george-kittle-christian-mccaffrey-49ers-duo-11x14-.jpg",
  "/images/catalog/memorabilia/memorabilia_29_raiders-all-time-greats-11x14.jpg",
  "/images/catalog/memorabilia/memorabilia_30_palmer-nicklaus-woods.jpg",
  "/images/catalog/memorabilia/memorabilia_31_masters-champions-commemorative-large-piece.jpg",

  // Travel — the six that are photographs rather than sales artwork.
  "/images/catalog/trips/trip_07_southern-californias-finest-destination.jpg",
  "/images/catalog/trips/trip_09_waikiki-city-lights-view-room.jpg",
  "/images/catalog/trips/trip_10_oahu-hawaii.jpg",
  "/images/catalog/trips/trip_12_south-lake-tahoe-california.jpg",
  "/images/catalog/trips/trip_24_4night-getaway.jpg",
  "/images/catalog/trips/trip_31_under-the-tuscany.jpg",
]);

/**
 * Categories that photograph alike, collapsed into one family.
 *
 * Adjacency is enforced on the family, not the catalog category, because the
 * catalog splits by what a lot IS and the strip is judged on what a lot LOOKS
 * like. Vacations and Bucket List Trips are two categories and one wall of
 * beach; Signed Guitars and the single-lot Taylor Swift Guitar category are two
 * categories and the same sunburst acoustic on white. Enforcing on category let
 * three beach-beach pairs through.
 *
 * A category not listed here is its own family, so a new one added in the admin
 * keeps the old behaviour until somebody decides what it resembles.
 */
const VISUAL_FAMILIES: Record<string, string> = {
  "item-vacations": "travel",
  "item-bucket-list": "travel",
  "item-meet-greets": "travel",
  "item-signed-guitars": "guitars",
  "item-taylor-swift-guitar": "guitars",
};

const familyOf = (categoryId: string) =>
  VISUAL_FAMILIES[categoryId] ?? categoryId;

interface Tile {
  src: string;
  key: string;
  family: string;
}

/**
 * One photograph per category per pass, in catalog order, with no two
 * neighbours from the same category.
 *
 * Round-robin rather than the first 14 lots: the catalog is grouped, so reading
 * straight through gives fourteen consecutive gold records. Deterministic on
 * purpose — a shuffle would rewrite the static HTML on every build for no
 * visible gain.
 *
 * The cursor walks the categories in order, which produces the round-robin, and
 * a category equal to the previous tile's is skipped rather than taken, which
 * enforces the adjacency rule outright instead of leaving it to fall out of the
 * rotation. Plain round-robin only alternates while every category still has
 * stock; once the small ones are exhausted a later pass would otherwise put two
 * of the same together at a round boundary.
 *
 * The strip is a loop, so the last tile neighbours the first — the final slot
 * excludes the opening category too. If no legal tile exists for a slot the
 * strip simply ends one short, which nobody can see, rather than placing a
 * neighbour that breaks the rule.
 *
 * Note this is the catalog's own idea of a category. Vacations and Bucket List
 * Trips are two of them, so a beach can legally follow a beach.
 */
function pickTiles(categories: AuctionItem[]): Tile[] {
  const queues = categories.map((category) => ({
    id: category.id,
    family: familyOf(category.id),
    items: category.groups
      .flatMap((group) => group.items)
      .filter((item) => item.image?.src && APPROVED_IMAGES.has(item.image.src))
      .map((item) => ({
        src: item.image!.src,
        key: item.id,
        family: familyOf(category.id),
      })),
  }));

  const tiles: Tile[] = [];
  // Some lots are photographed with the same shot, and the same photograph
  // twice in a fourteen-tile loop reads as a rendering fault.
  const seen = new Set<string>();
  let cursor = 0;

  while (tiles.length < TILE_COUNT) {
    const previous = tiles.at(-1)?.family;
    // Only meaningful once there is an opening tile to wrap around to.
    const closesLoop = tiles.length === TILE_COUNT - 1 && tiles.length > 1;

    let taken: Tile | undefined;

    for (let step = 0; step < queues.length && !taken; step++) {
      const queue = queues[(cursor + step) % queues.length];
      if (queue.family === previous) continue;
      if (closesLoop && queue.family === tiles[0].family) continue;

      while (queue.items.length > 0) {
        const candidate = queue.items.shift()!;
        if (seen.has(candidate.src)) continue;
        seen.add(candidate.src);
        taken = candidate;
        cursor = (cursor + step + 1) % queues.length;
        break;
      }
    }

    if (!taken) break;
    tiles.push(taken);
  }

  return tiles;
}

export function ItemMarquee({ categories }: { categories: AuctionItem[] }) {
  const tiles = pickTiles(categories);
  if (tiles.length === 0) return null;

  return (
    <div className="i-track-wrap" aria-hidden="true">
      <div className="i-track">
        {tiles.map((tile) => (
          <div className="i-tile" key={tile.key}>
            <Image
              src={tile.src}
              alt=""
              fill
              sizes="280px"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
        {/* Visual duplicate that completes the seamless loop. */}
        {tiles.map((tile) => (
          <div className="i-tile" key={`${tile.key}-loop`}>
            <Image
              src={tile.src}
              alt=""
              fill
              sizes="280px"
              style={{ objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
