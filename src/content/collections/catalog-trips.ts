import type { CategoryItem } from "../types";

const DIR = "/images/catalog/trips";

/**
 * Travel and experience lots. Real client inventory, photographed/supplied by
 * the client.
 *
 * NOTE ON MATCHING: several filenames in public/images/catalog/trips describe
 * the wrong lot — the source page they came from had a chaotic layout, so the
 * scraper picked up whichever caption sat nearest. Matching here was done by
 * looking at the images, not by trusting the filename. The mismatches are
 * called out inline so nobody "corrects" them back later.
 *
 * The client supplied one flat list of trips; splitting it across Affordable
 * Vacations / Bucket List Trips / Meet & Greets is an editorial judgement made
 * here, not something the client specified. Move items freely between the
 * three arrays.
 *
 * The three are now three GROUPS of one category rather than three categories
 * of their own — one page to browse instead of three — so moving an item
 * between these arrays now moves it between headings on the same page.
 *
 * `documentSlug` is the brochure the client already hands out, imported from the
 * old site into Documents by `scripts/import-trip-brochures.ts`. It is the
 * permanent `/d/` address rather than a file, so replacing the PDF in the admin
 * repoints every lot that names it without touching this file.
 *
 * `affordableTier: true` on every lot in `vacationItems` is what draws the gold
 * star on the category page. It is not a new judgement: the client's own split
 * put these fourteen in "Affordable Vacations", and the star is that grouping
 * surviving the merge in a form a bidder can see at a glance. Nothing here
 * states a price, which is the rule everywhere else in the catalog too.
 */

/* ------------------------------------------------------------------ */
/* Affordable Vacations — value-led, mostly domestic, priced to sell   */
/* ------------------------------------------------------------------ */
export const vacationItems: CategoryItem[] = [
  {
    id: "trip-catalina-baja-cruise",
    documentSlug: "catalina-baja-cruise",
    affordableTier: true,
    name: "Catalina & Baja Cruise for Two",
    description:
      "Five days and four nights aboard a Catalina and Baja sailing, based on an inside cabin for two.",
    image: {
      src: `${DIR}/trip_03_choose-from-a-studio-to-1-bedroom-for.jpg`,
      // Filename says "studio to 1 bedroom"; the graphic is the 5 day / 4 night México cruise.
      alt: "Promotional graphic for a five day, four night México cruise vacation for two, offered as a charity auction lot",
    },
  },
  {
    id: "trip-dream-vacation-getaway",
    documentSlug: "dream-vacation-getaway",
    affordableTier: true,
    name: "Dream Vacation Getaway",
    description:
      "Eight days and seven nights in a studio to one-bedroom unit for two adults and two children, with thousands of destinations to choose from.",
    image: {
      src: `${DIR}/trip_04_choose-from-a-studio-to-1-bedroom-for.jpg`,
      alt: "Collage of worldwide holiday destinations promoting an eight day, seven night dream vacation getaway auction package",
    },
  },
  {
    id: "trip-disneyland-anaheim",
    documentSlug: "disneyland-anaheim",
    affordableTier: true,
    name: "Disneyland Experience, Anaheim",
    description:
      "Four days and three nights in Anaheim with park tickets and hotel for two adults and two children.",
    image: {
      src: `${DIR}/trip_05_anaheim-california.jpg`,
      alt: "Mickey Mouse in front of the illuminated Disneyland castle, representing the Anaheim Disneyland auction package",
    },
  },
  {
    id: "trip-outrigger-waikiki",
    documentSlug: "outrigger-waikiki",
    affordableTier: true,
    name: "Outrigger Waikiki Beach Resort",
    description:
      "Six days and five nights in an ocean front room at the Outrigger Waikiki Beach Resort.",
    image: {
      src: `${DIR}/trip_06_waikiki-city-lights-view-room.jpg`,
      alt: "Waikiki beach and Diamond Head seen from above, representing the Outrigger Waikiki Beach Resort auction package",
    },
  },
  {
    id: "trip-hilton-huntington-beach",
    documentSlug: "hilton-huntington-beach",
    affordableTier: true,
    name: "Hilton Huntington Beach Oceanfront",
    description:
      "Six days and five nights oceanfront at the Hilton Huntington Beach resort.",
    image: {
      src: `${DIR}/trip_07_southern-californias-finest-destination.jpg`,
      alt: "Palm-lined resort pool at sunset in Southern California, representing the Hilton Huntington Beach oceanfront auction package",
    },
  },
  {
    id: "trip-tahoe-marriott",
    documentSlug: "tahoe-marriott-timber-lodge",
    affordableTier: true,
    name: "Lake Tahoe Marriott Timber Lodge",
    description:
      "Eight days and seven nights in a two-bedroom villa at the Marriott Timber Lodge, South Lake Tahoe.",
    image: {
      src: `${DIR}/trip_12_south-lake-tahoe-california.jpg`,
      alt: "Alpine lodge buildings and gondola cabins at South Lake Tahoe, representing the Marriott Timber Lodge auction package",
    },
  },
  {
    id: "trip-disney-world-orlando",
    documentSlug: "disney-world-orlando",
    affordableTier: true,
    name: "Disney World, Orlando",
    description:
      "Three-day family four-pack of park hopper tickets plus four nights' accommodation in Orlando.",
    image: {
      src: `${DIR}/trip_13_3-day-family-4pack-park-hopper-tickets.jpg`,
      alt: "Walt Disney World castle with Disney characters, promoting a three day park hopper and four night stay auction package",
    },
  },
  {
    id: "trip-cancun-all-inclusive",
    documentSlug: "cancun-all-inclusive",
    affordableTier: true,
    name: "All-Inclusive Cancún",
    description:
      "Five days and four nights all-inclusive for two adults and two children at the Royal Sunset or Sunset Marina.",
    image: {
      src: `${DIR}/trip_16_2-adults-2-children-12-and-under.jpg`,
      alt: "Cancún beachfront resort and marina views, representing the all-inclusive Cancún family auction package",
    },
  },
  {
    id: "trip-tahoe-hilton-club",
    documentSlug: "tahoe-hilton-club",
    affordableTier: true,
    name: "Lake Tahoe Hilton Club",
    description:
      "Eight days and seven nights at the Lake Tahoe Hilton Club resort.",
    image: {
      src: `${DIR}/trip_17_lake-tahoe-hilton-club-resort.jpg`,
      alt: "Timber and stone lodge entrance at the Lake Tahoe Hilton Club resort, a charity auction travel package",
    },
  },
  {
    id: "trip-mayan-luxury",
    documentSlug: "mayan-luxury-resort",
    affordableTier: true,
    name: "Mayan Luxury Resort, Mexico",
    description:
      "Five nights at a Mayan luxury resort, with the winner choosing from six destinations.",
    image: {
      src: `${DIR}/trip_19_5-night-2-adults-2-children.jpg`,
      alt: "Aerial view of a large Mexican resort pool complex, representing the Mayan luxury resort auction package",
    },
  },
  {
    id: "trip-luxury-4-night",
    documentSlug: "luxury-4-night-getaway",
    affordableTier: true,
    name: "All-Inclusive Luxury 4-Night Getaway",
    description:
      "Four nights all-inclusive across Mexico, the Caribbean or Central America, with more than thirty properties to choose from.",
    image: {
      src: `${DIR}/trip_24_4night-getaway.jpg`,
      alt: "Beachfront luxury resort seen from the sea, representing the all-inclusive four night getaway auction package",
    },
  },
  {
    id: "trip-golf-sedona",
    documentSlug: "golf-sedona",
    affordableTier: true,
    name: "Golf in Sedona, Arizona",
    description:
      "Five nights for two in Sedona with a $300 golf allowance at the course of your choice.",
    image: {
      src: `${DIR}/trip_25_golf-in-sedona-az.jpg`,
      alt: "Sedona red rock formations and golf course promotional graphic for the Arizona golf auction package",
    },
  },
  {
    id: "trip-viva-las-vegas",
    documentSlug: "viva-las-vegas",
    affordableTier: true,
    name: "Viva Las Vegas",
    description:
      "Four days and three nights in Las Vegas with a choice of four hotels.",
    image: {
      src: `${DIR}/trip_26_viva-las-vegas.jpg`,
      alt: "Las Vegas Strip illuminated at night, representing the Viva Las Vegas auction travel package",
    },
  },
  {
    id: "trip-stronghold-arnold",
    documentSlug: "stronghold-arnold",
    affordableTier: true,
    name: "The Stronghold Mountain Home, Arnold CA",
    description:
      "A stay at The Stronghold in Arnold, California, with a private lake, hot tub and more.",
    image: {
      src: `${DIR}/trip_23_spectacular-mountain-home.jpg`,
      alt: "Mountain home exterior and deck with hot tub at The Stronghold in Arnold, California, a charity auction stay",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Bucket List Trips — headline, long-haul and once-in-a-lifetime      */
/* ------------------------------------------------------------------ */
export const bucketListItems: CategoryItem[] = [
  {
    id: "trip-sphere-las-vegas",
    documentSlug: "sphere-las-vegas",
    name: "The Sphere, Las Vegas — Two-Night Experience",
    description:
      "A two-night Las Vegas experience built around a show at The Sphere, valid for any residency.",
    image: {
      src: `${DIR}/trip_08_the-grateful-dead-kenny-chesney.jpg`,
      alt: "Posters for Grateful Dead and Kenny Chesney residencies at The Sphere Las Vegas, a charity auction experience package",
    },
  },
  {
    id: "trip-atlantis-bahamas",
    documentSlug: "atlantis-bahamas",
    name: "Atlantis Harborside, Bahamas",
    description:
      "Five days and four nights at Atlantis Harborside on Paradise Island, Bahamas.",
    image: {
      // Filename says "waikiki"; the photograph is Atlantis, Paradise Island.
      src: `${DIR}/trip_09_waikiki-city-lights-view-room.jpg`,
      alt: "Aerial view of the Atlantis resort and water park on Paradise Island, Bahamas, a charity auction travel package",
    },
  },
  {
    id: "trip-aulani-oahu",
    documentSlug: "aulani-oahu",
    name: "Aulani, a Disney Resort — O'ahu",
    description:
      "Five days and four nights at Aulani, Disney's resort on O'ahu, Hawai'i.",
    image: {
      src: `${DIR}/trip_10_oahu-hawaii.jpg`,
      alt: "Aulani Disney resort buildings beside the beach on O'ahu, Hawai'i, offered as a charity auction travel package",
    },
  },
  {
    id: "trip-african-safari",
    documentSlug: "african-photo-safari",
    name: "African Photo Safari, South Africa",
    description:
      "Six days and six nights in South Africa for two, including meals and guided safari.",
    image: {
      // Filename says "park hopper tickets"; the photograph is safari wildlife.
      src: `${DIR}/trip_14_3-day-family-4pack-park-hopper-tickets.jpg`,
      alt: "Lions and elephants photographed on an African safari, representing the South Africa photo safari auction package",
    },
  },
  {
    id: "trip-ultimate-beach",
    documentSlug: "ultimate-beach-destination",
    name: "Ultimate Beach Destination",
    description:
      "Eight days and seven nights with the winner's choice of Bali, Spain, Hawai'i or Puerto Vallarta.",
    image: {
      src: `${DIR}/trip_15_winners-choice-4-destinations.jpg`,
      alt: "Beach destination collage including Puerto Vallarta and Maui, representing the ultimate beach destination auction package",
    },
  },
  {
    id: "trip-wrigley-field",
    documentSlug: "wrigley-field-chicago",
    name: "Wrigley Field Getaway, Chicago",
    description:
      "Unlimited food and beverages during the game at Wrigley Field, plus two nights at the Hyatt Magnificent Mile.",
    image: {
      src: `${DIR}/trip_18_2night-double-occupacy-stay-at-the.jpg`,
      alt: "Batter at the plate and a packed Wrigley Field grandstand, representing the Chicago baseball getaway auction package",
    },
  },
  {
    id: "trip-nascar",
    documentSlug: "nascar-driving-experience",
    name: "Ultimate NASCAR Driving Experience",
    description:
      "An eight-minute stock car driving experience, available at more than eleven speedways.",
    image: {
      // Filename says "gold country"; the photograph is a driver in a race car.
      src: `${DIR}/trip_21_in-the-heart-of-gold-country.jpg`,
      alt: "Driver in helmet and harness at the wheel of a stock car, representing the NASCAR driving experience auction lot",
    },
  },
  {
    id: "trip-hawaii-or-ireland",
    documentSlug: "hawaii-or-ireland",
    name: "Hawai'i or Ireland",
    description:
      "Eight days and seven nights in two bedrooms, with the winner choosing Hawai'i or Ireland.",
    image: {
      src: `${DIR}/trip_22_hawaii-or-ireland.jpg`,
      alt: "Split graphic showing Irish county signs, a golf resort and a Maui beach, for the Hawai'i or Ireland auction package",
    },
  },
  {
    id: "trip-tuscan-sun",
    documentSlug: "under-the-tuscan-sun",
    name: "Under the Tuscan Sun Apartment",
    description:
      "Seven days and six nights in an apartment in Tuscany, Italy.",
    image: {
      src: `${DIR}/trip_31_under-the-tuscany.jpg`,
      alt: "Hilltop Tuscan village of stone buildings above the countryside, representing the Under the Tuscan Sun auction stay",
    },
  },
  {
    id: "trip-sushi-party",
    documentSlug: "sushi-party-for-20",
    name: "Sushi Party for 20 in Your Home",
    description:
      "A chef-prepared sushi party for twenty guests in your own home. Bay Area cities unless approved in advance.",
    image: {
      src: `${DIR}/trip_27_bay-area-cities-unless-approved-in-advance.jpg`,
      alt: "Platters of prepared sushi rolls laid out for a private party, offered as a charity auction experience",
    },
  },
  {
    id: "trip-spirits-experience",
    documentSlug: "spirits-experience-for-10",
    name: "Unforgettable Spirits Experience for 10",
    description:
      "A guided tasting experience for ten guests across a curated selection of spirits.",
    image: {
      src: `${DIR}/trip_30_unforgetable-spirits-experience-for-10.jpg`,
      alt: "Bottles of premium whiskey and filled tasting glasses, representing the spirits tasting experience auction lot",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Meet & Greets — lots whose value is the access itself               */
/* ------------------------------------------------------------------ */
export const meetGreetItems: CategoryItem[] = [
  {
    id: "trip-warriors-franco-finn",
    documentSlug: "warriors-tickets-meet-greet",
    name: "Golden State Warriors Tickets & HypeMan Franco Finn Meet and Greet",
    description:
      "Two lower bowl tickets to a Golden State Warriors game, plus a meet and greet with Warriors HypeMan Franco Finn.",
    image: {
      src: `${DIR}/trip_11_and-other-future-shows.jpg`,
      alt: "Golden State Warriors logo beside Warriors HypeMan Franco Finn, representing the tickets and meet and greet auction lot",
    },
  },
  {
    id: "trip-andrea-bocelli",
    documentSlug: "andrea-bocelli-meet-greet",
    name: "Andrea Bocelli — Premium Tickets, Backstage Meet and Greet & Signed Memorabilia",
    description:
      "Two premium tickets to Andrea Bocelli in concert, with a backstage meet and greet and signed memorabilia.",
    image: {
      // Filename says "food and beverages included"; the graphic is the Bocelli concert poster.
      src: `${DIR}/trip_20_food-and-beverages-included.jpg`,
      alt: "Andrea Bocelli in Concert promotional poster, representing the premium tickets and backstage meet and greet auction lot",
    },
  },
];
