import type { AuctionItem } from "../types";
import { signedGuitarItems } from "./catalog-guitars";
import { goldAlbumItems } from "./catalog-gold-albums";
import { memorabiliaGroups } from "./catalog-memorabilia";
import {
  vacationItems,
  bucketListItems,
  meetGreetItems,
} from "./catalog-trips";

/**
 * Auction catalog categories. Each renders as a bento tile on /auction-items
 * and as its own page at /auction-items/[slug].
 * Phase 2: an `auction_categories` table with an `auction_items` child table.
 *
 * Lots and photography are the client's real inventory, held in
 * src/content/collections/catalog-*.ts and public/images/catalog/.
 *
 * Jewelry and Handbags with Swarovski Crystals were `generalOnly: true` until
 * September 2026 — the client's legacy site sent both to their sister site,
 * jewelsforyourcause.com, and this one described the category rather than
 * naming stock. Each now opens with two real lots transcribed from that site
 * (names, stone sizes, appraised values, the client's own photographs) so the
 * client can add the rest through the admin. Appraised retail values are
 * shown on these lots by the client's decision: it is the figure a bidder
 * sees at the auction, and the one the client already publishes.
 *
 * `generalOnly` stays in the schema for any future category that needs it.
 */

/** Shown on every category page. Inventory turns over constantly. */
export const availabilityNotice =
  "Inventory changes constantly — contact us to confirm current availability for your event date.";

/** Shown instead on categories the client lists without named lots. */
export const generalCategoryNotice =
  "Specific pieces vary by event. Contact us to confirm current availability and see what is in stock for your date.";

/**
 * The key for the gold star, shown at the top of any GROUP that has a starred
 * lot in it and left off entirely where nothing is starred.
 *
 * Per group rather than once per page: the travel category runs to 27 lots
 * under three headings, and a key at the top of that is off screen long before
 * anyone reaches the stars further down.
 *
 * It says what the star means and nothing more. The site quotes no figure for
 * any individual lot, so the star marks a tier and the opening bid stays a
 * conversation — which is also what makes the mark durable as costs move.
 */
export const affordableTierNotice =
  "marks our more affordable lots — ask us for the opening bid on any of them.";

export const auctionItems: AuctionItem[] = [
  /**
   * One category, three groups. Affordable Vacations, Bucket List Trips and
   * Meet & Greets were three categories and three pages; a visitor after a trip
   * had to guess which of the three held it, and the two smaller ones held 11
   * and 2 lots. They are groups of this one now.
   *
   * The three sets of copy are kept rather than replaced: each group carries
   * the heading and the introduction its category had, so nothing the client
   * wrote was thrown away to make room for a merged page. What is new is only
   * the category-level title, blurb and heading, which had to cover all three.
   *
   * `vacations` stays the slug. It is the one of the three that was already
   * linked from the legacy redirects in next.config.ts, and a slug is the last
   * thing to change when the point of the exercise is fewer broken paths.
   */
  {
    id: "item-vacations",
    slug: "vacations",
    icon: "palm-tree",
    title: "Travel & Experiences",
    blurb: "Crowd-pleasing getaways, bucket-list escapes and celebrity access.",
    span: "wide",
    image: {
      // Chosen because it carries no burned-in "$1500 or Less" starburst.
      // Several of the client's trip graphics do; those price claims are fine
      // inside a lot card but should not headline a category tile.
      src: "/images/catalog/trips/trip_24_4night-getaway.jpg",
      alt: "Beachfront luxury resort seen from the sea, representing the vacation packages available for charity auctions",
    },
    heading: "Travel & Experiences for Charity Auctions",
    intro:
      "Travel is the most reliable earner at almost every fundraiser: it appeals to a wide range of guests, photographs beautifully in a catalog, and can be sold more than once in the same night. These packages are priced so there is margin from the opening bid.",
    seo: {
      title: "Travel & Experience Packages for Charity Auctions | CharityWorks",
      description:
        "Consignment travel and experience lots for nonprofit auctions — cruises, resort stays, Disney, Tahoe, safaris, The Sphere and celebrity meet and greets. No upfront cost, and you only pay for what sells.",
      targetTerms: [
        "vacation packages for charity auctions",
        "travel auction items for nonprofits",
        "live auction travel packages",
        "gala auction ideas",
      ],
      path: "/auction-items/vacations",
    },
    groups: [
      {
        id: "vacations-all",
        title: "Affordable Vacations",
        blurb: "Crowd-pleasing getaways priced to sell and stack profit.",
        items: vacationItems,
      },
      {
        id: "bucket-all",
        title: "Bucket List Trips",
        blurb:
          "Headline travel lots exist to anchor your live auction. They set the tone early, give your auctioneer something to build the room around, and raise the ceiling for everything that follows.",
        items: bucketListItems,
      },
      {
        id: "meet-all",
        title: "Meet & Greets",
        blurb:
          "Experiences have no retail price a bidder can look up, which is exactly why they perform. When two people in the room both want the same access, the bidding rarely stops where you expect.",
        items: meetGreetItems,
      },
    ],
  },
  {
    id: "item-signed-guitars",
    slug: "signed-guitars",
    icon: "guitar",
    title: "Hand-Signed Guitars",
    blurb: "Celebrity & rock legends — authenticated showpieces.",
    image: {
      src: "/images/catalog/guitars/guitar_02_morgan-wallen.jpg",
      alt: "Sunburst acoustic guitar hand-signed by Morgan Wallen, the style of celebrity signed guitar offered as a fundraiser auction item",
    },
    heading: "Celebrity Signed Guitars for Fundraiser Auctions",
    intro:
      "A signed guitar is the single most requested item in our catalog. It displays well on a stage or easel, needs no explanation to a room, and consistently outperforms its opening bid. Every guitar in this category is genuinely hand-signed.",
    seo: {
      title: "Celebrity Signed Guitar Fundraiser Auction Items | CharityWorks",
      description:
        "Hand-signed acoustic guitars for charity auctions — Taylor Swift, Ed Sheeran, Bruce Springsteen, Elton John and more, on risk-free consignment.",
      targetTerms: [
        "celebrity signed guitar fundraiser",
        "signed guitar charity auction",
        "music memorabilia auction items",
      ],
      path: "/auction-items/signed-guitars",
    },
    groups: [{ id: "guitars-all", items: signedGuitarItems }],
  },
  {
    id: "item-memorabilia",
    slug: "sports-celebrity-memorabilia",
    icon: "trophy",
    title: "Sports & Celebrity Memorabilia",
    blurb: "The WOW factor that creates buzz and drives up every bid.",
    span: "tall",
    image: {
      src: "/images/catalog/memorabilia/memorabilia_01_george-kittle-49ers-handsigned-framed-jersey.jpg",
      alt: "Framed red San Francisco 49ers jersey hand-signed by George Kittle, representing the sports and celebrity memorabilia category",
    },
    heading: "Sports & Celebrity Memorabilia for Charity Auctions",
    intro:
      "Memorabilia creates the buzz that makes a room bid. Signed pieces give guests a reason to gather around a table during a silent auction, and give your auctioneer a story to tell during a live one. Hand-signed and reproduced-signature tiers are listed separately below.",
    seo: {
      title: "Sports & Celebrity Memorabilia Auction Items | CharityWorks",
      description:
        "Hand-signed framed jerseys from the 49ers, Warriors, Giants, Raiders, Dodgers and Sharks, plus music commemoratives, on risk-free consignment.",
      targetTerms: [
        "sports memorabilia charity auction",
        "signed jersey auction item",
        "celebrity memorabilia auction items",
      ],
      path: "/auction-items/sports-celebrity-memorabilia",
    },
    groups: memorabiliaGroups,
  },
  {
    id: "item-jewelry",
    slug: "jewelry",
    icon: "gem",
    title: "Gemstone & Costume Jewelry",
    blurb: "Sparkle that sells across every demographic.",
    image: {
      src: "/images/catalog/jewelry/jewelry_01_sapphire-white-topaz-necklace.jpg",
      alt: "Sterling silver necklace set with dark blue sapphires framed in white topaz, representing the gemstone jewelry offered for gala auctions",
      width: 480,
      height: 477,
    },
    heading: "Jewelry for Gala & Silent Auctions",
    intro:
      "Jewelry is the workhorse of a silent auction. It covers a wide range of price points, so it keeps bidding sheets busy across every table rather than concentrating spend on a handful of headline lots. Every gemstone piece is set in .925 sterling silver and comes with its appraisal card stating the stone sizes and weights.",
    seo: {
      title: "Gemstone & Costume Jewelry for Gala Auctions | CharityWorks",
      description:
        "Gemstone and costume jewelry for nonprofit silent auctions, across a range of price points. Consignment terms — return anything that does not sell.",
      targetTerms: [
        "jewelry for charity auctions",
        "silent auction items for nonprofits",
        "gala auction ideas",
      ],
      path: "/auction-items/jewelry",
    },
    groups: [
      {
        id: "jewelry-all",
        title: "Gemstone Jewelry",
        blurb:
          "Set in .925 sterling silver, each piece supplied with its appraisal card detailing stone size and weight. Costume pieces at accessible price points are also available — ask us.",
        // Transcribed from jewelsforyourcause.com, the client's own site:
        // names, stone sizes and appraised values are theirs, and nothing
        // about a stone is stated that the listing does not state. "Dyed"
        // stays in the name — it is a disclosure, not a flourish.
        items: [
          {
            id: "jewelry-sapphire-white-topaz-necklace",
            name: "Dyed Sapphire & White Topaz Necklace",
            description:
              "Dyed sapphires framed in white topaz, set in .925 sterling silver. Supplied with the appraisal card stating the stone sizes and weights.",
            image: {
              src: "/images/catalog/jewelry/jewelry_01_sapphire-white-topaz-necklace.jpg",
              alt: "Sterling silver necklace of dark blue dyed sapphires, each framed in white topaz, with a pear-shaped sapphire drop, a charity auction lot",
              width: 480,
              height: 477,
            },
            details: [
              { label: "Appraised retail value", value: "$5,320" },
              { label: "Metal", value: ".925 sterling silver" },
              { label: "Includes", value: "Appraisal card" },
            ],
          },
          {
            id: "jewelry-emerald-pearl-necklace",
            name: "Emerald & Pearl Necklace",
            description:
              "A 7mm pearl set among 2mm emeralds in .925 sterling silver. Supplied with the appraisal card stating the stone sizes and weights.",
            image: {
              src: "/images/catalog/jewelry/jewelry_02_emerald-pearl-necklace.jpg",
              alt: "Sterling silver pendant necklace with a white pearl at the centre of an open frame edged in small green emeralds, a charity auction lot",
              width: 488,
              height: 480,
            },
            details: [
              { label: "Appraised retail value", value: "$910" },
              { label: "Stones", value: "Pearl 7.00mm, emerald 2.00mm" },
              { label: "Metal", value: ".925 sterling silver" },
              { label: "Includes", value: "Appraisal card" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "item-handbags",
    slug: "handbags",
    icon: "handbag",
    title: "Handbags with Swarovski Crystals",
    blurb: "Dazzling statement pieces guests adore.",
    image: {
      // The client's own photograph, uploaded by them through the admin in
      // September 2026 and mirrored here for the seed. Their bags are their
      // own make, so there is no third-party trademark in the picture.
      src: "/images/catalog/handbags/handbag_01_spectacular-odyssey-blue.jpg",
      alt: "Swarovski element purse",
      width: 725,
      height: 464,
    },
    heading: "Crystal Handbags for Charity Auctions",
    intro:
      "Crystal-embellished handbags photograph exceptionally well and draw guests toward a table. They work as a mid-tier lot that lifts the average bid across a silent auction. Each bag is hand-finished with over a thousand Swarovski crystals, fully lined, with a 24-inch metal chain.",
    seo: {
      title: "Handbags with Swarovski Crystals for Auctions | CharityWorks",
      description:
        "Crystal-embellished handbags for nonprofit silent auctions and galas. Offered on consignment with no upfront cost to your organization.",
      targetTerms: [
        "handbags for charity auction",
        "silent auction items for nonprofits",
        "gala auction ideas",
      ],
      path: "/auction-items/handbags",
    },
    groups: [
      {
        id: "handbags-all",
        title: "Hand-Crafted Purses with Swarovski Elements",
        // The client's own wording from jewelsforyourcause.com, lightly
        // joined. The $1,200+ figure is theirs: an appraised value shown to
        // bidders, which the client asked to have on the page.
        blurb:
          "Each purse is made with over 1,000 Swarovski crystals — they never lose their luster and never fade — and is as much a display piece as an evening bag. Fully lined, with a 24-inch metal chain. Purses are valued at $1,200 or more.",
        items: [
          {
            id: "handbags-spectacular-odyssey-blue",
            name: "Spectacular Odyssey — Blue",
            description:
              "A hard-case evening clutch covered edge to edge in blue and clear Swarovski crystals, with a jewelled clasp. Fully lined, with a 24-inch metal chain.",
            image: {
              src: "/images/catalog/handbags/handbag_01_spectacular-odyssey-blue.jpg",
              alt: "Rectangular evening clutch covered in blue and clear Swarovski crystals in a radiating medallion pattern, a charity auction lot",
              width: 725,
              height: 464,
            },
            details: [
              { label: "Appraised retail value", value: "$1,200+" },
              { label: "Crystals", value: "Swarovski Elements, over 1,000 per bag" },
              { label: "Includes", value: "24-inch metal chain; fully lined" },
            ],
          },
          {
            id: "handbags-inspired-by-princess-diana-blue",
            name: "Inspired by Princess Diana — Blue",
            description:
              "A hard-case clutch set with blue and clear Swarovski crystals in a rose-and-leaf design. Fully lined, with a 24-inch metal chain.",
            image: {
              src: "/images/catalog/handbags/handbag_02_inspired-by-princess-diana-blue.jpg",
              alt: "Hard-case clutch covered in blue and clear Swarovski crystals arranged as a large rose with leaves, a charity auction lot",
              width: 525,
              height: 394,
            },
            details: [
              { label: "Appraised retail value", value: "$1,200+" },
              { label: "Size", value: "Approx. 7 × 4.5 in" },
              { label: "Crystals", value: "Swarovski Elements, over 1,000 per bag" },
              { label: "Includes", value: "24-inch metal chain; fully lined" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "item-gold-albums",
    slug: "gold-albums",
    icon: "disc",
    title: "Gold Album Showcases",
    blurb: "Framed music history that commands the room.",
    image: {
      src: "/images/catalog/gold-albums/goldalbum_02_beatles.jpg",
      alt: "Framed gold record displayed beside the Beatles Abbey Road album cover, representing the gold album showcase category",
    },
    heading: "Gold Album Displays for Charity Auctions",
    intro:
      "Framed album displays arrive ready to hang, which makes them an easy yes for a bidder picturing it on a wall at home or in an office. They also fill wall space attractively at the event itself. Signatures in this category are laser reproductions rather than hand-signed.",
    seo: {
      title: "Framed Gold Album Displays for Auctions | CharityWorks",
      description:
        "Framed gold album showcases for nonprofit auctions — the Beatles, Queen, Pink Floyd, Elvis, Taylor Swift and more, on risk-free consignment.",
      targetTerms: [
        "gold album auction item",
        "music memorabilia auction items",
        "charity auction items",
      ],
      path: "/auction-items/gold-albums",
    },
    groups: [{ id: "albums-all", items: goldAlbumItems }],
  },
  {
    id: "item-taylor-swift-guitar",
    slug: "taylor-swift-signed-guitar",
    icon: "guitar",
    title: "Taylor Swift Signed Guitar",
    blurb:
      "An authenticated, hand-signed guitar to auction — the headline showpiece your guests will talk about all night.",
    span: "wide",
    image: {
      src: "/images/catalog/guitars/guitar_01_taylor-swift.jpg",
      alt: "Acoustic guitar hand-signed by Taylor Swift with tour photo artwork across the body, available to nonprofits for auction",
    },
    heading: "Taylor Swift Signed Guitar for Your Fundraiser",
    intro:
      "This is a hand-signed guitar offered as an auction lot — not an appearance or a performance by the artist. It is the piece that gets photographed, shared, and talked about after the event, and it reliably draws bidders who came for nothing else.",
    seo: {
      title: "Taylor Swift Signed Guitar for Charity Auctions | CharityWorks",
      description:
        "A Taylor Swift hand-signed acoustic guitar offered to nonprofits as an auction lot. Consignment terms — return it if it does not sell.",
      targetTerms: [
        "taylor swift signed guitar",
        "celebrity signed guitar fundraiser",
        "charity auction items",
      ],
      path: "/auction-items/taylor-swift-signed-guitar",
    },
    groups: [
      {
        id: "swift-all",
        items: [
          {
            id: "swift-guitar-artwork",
            name: "Taylor Swift Hand-Signed Acoustic Guitar — Tour Artwork",
            description:
              "Full-size acoustic finished with Taylor Swift tour photography across the body and hand-signed on the upper bout. This is a physical item for your auction; it does not include an appearance by the artist.",
            image: {
              src: "/images/catalog/guitars/guitar_01_taylor-swift.jpg",
              alt: "Black acoustic guitar hand-signed by Taylor Swift with tour photo artwork covering the body, a charity auction lot",
            },
          },
          {
            id: "swift-guitar-sunburst",
            name: "Taylor Swift Hand-Signed Acoustic Guitar — Sunburst",
            description:
              "Sunburst acoustic hand-signed by Taylor Swift, with a photo inlay set into the body.",
            image: {
              src: "/images/catalog/guitars/guitar_10_taylor-swift.jpg",
              alt: "Sunburst acoustic guitar hand-signed by Taylor Swift with a photo inlay on the body, a charity auction lot",
            },
          },
        ],
      },
    ],
  },
];
