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
 * Two categories — Jewelry and Swarovski Handbags — carry `generalOnly: true`.
 * The client lists those only as categories with no named lots, so the pages
 * describe what the category contains rather than claiming specific stock.
 * They are also the only two still using stock photography.
 */

/** Shown on every category page. Inventory turns over constantly. */
export const availabilityNotice =
  "Inventory changes constantly — contact us to confirm current availability for your event date.";

/** Shown instead on categories the client lists without named lots. */
export const generalCategoryNotice =
  "Specific pieces vary by event. Contact us to confirm current availability and see what is in stock for your date.";

export const auctionItems: AuctionItem[] = [
  {
    id: "item-vacations",
    slug: "vacations",
    icon: "🌴",
    title: "Affordable Vacations",
    blurb: "Crowd-pleasing getaways priced to sell and stack profit.",
    span: "wide",
    image: {
      // Chosen because it carries no burned-in "$1500 or Less" starburst.
      // Several of the client's trip graphics do; those price claims are fine
      // inside a lot card but should not headline a category tile.
      src: "/images/catalog/trips/trip_24_4night-getaway.jpg",
      alt: "Beachfront luxury resort seen from the sea, representing the vacation packages available for charity auctions",
    },
    heading: "Vacation Packages for Charity Auctions",
    intro:
      "Travel is the most reliable earner at almost every fundraiser: it appeals to a wide range of guests, photographs beautifully in a catalog, and can be sold more than once in the same night. These packages are priced so there is margin from the opening bid.",
    seo: {
      title: "Vacation Packages for Charity Auctions & Galas | CharityWorks",
      description:
        "Consignment vacation packages for nonprofit auctions — cruises, resort stays, Disney, Tahoe and Las Vegas. No upfront cost, and you only pay for what sells.",
      targetTerms: [
        "vacation packages for charity auctions",
        "travel auction items for nonprofits",
        "gala auction ideas",
      ],
      path: "/auction-items/vacations",
    },
    groups: [{ id: "vacations-all", items: vacationItems }],
  },
  {
    id: "item-bucket-list",
    slug: "bucket-list-trips",
    icon: "✈️",
    title: "Bucket List Trips",
    blurb: "Once-in-a-lifetime escapes that ignite a bidding war.",
    image: {
      src: "/images/catalog/trips/trip_14_3-day-family-4pack-park-hopper-tickets.jpg",
      alt: "Lions and elephants photographed on an African safari, representing bucket list travel packages for nonprofit fundraisers",
    },
    heading: "Bucket List Travel for Nonprofit Fundraisers",
    intro:
      "Headline travel lots exist to anchor your live auction. They set the tone early, give your auctioneer something to build the room around, and raise the ceiling for everything that follows.",
    seo: {
      title: "Bucket List Travel Auction Packages for Nonprofits | CharityWorks",
      description:
        "Headline auction lots for nonprofit live auctions — African safari, Atlantis Bahamas, The Sphere Las Vegas, Tuscany and more, on risk-free consignment.",
      targetTerms: [
        "live auction travel packages",
        "bucket list auction items",
        "charity auction items",
      ],
      path: "/auction-items/bucket-list-trips",
    },
    groups: [{ id: "bucket-all", items: bucketListItems }],
  },
  {
    id: "item-signed-guitars",
    slug: "signed-guitars",
    icon: "🎸",
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
    icon: "🏆",
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
    icon: "💎",
    title: "Gemstone & Costume Jewelry",
    blurb: "Sparkle that sells across every demographic.",
    image: {
      src: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=70",
      alt: "Pearl necklace displayed in an open presentation case, representing the jewelry selection available for gala auctions",
    },
    heading: "Jewelry for Gala & Silent Auctions",
    intro:
      "Jewelry is the workhorse of a silent auction. It covers a wide range of price points, so it keeps bidding sheets busy across every table rather than concentrating spend on a handful of headline lots.",
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
    generalOnly: true,
    groups: [
      {
        id: "jewelry-all",
        items: [
          {
            id: "jewelry-gemstone",
            name: "Gemstone Jewelry",
            description:
              "Gemstone pieces across a range of price points, supplied with their appraisal documentation.",
          },
          {
            id: "jewelry-costume",
            name: "Costume Jewelry",
            description:
              "Coordinated costume pieces at accessible price points, useful for filling out a silent auction table.",
          },
        ],
      },
    ],
  },
  {
    id: "item-handbags",
    slug: "handbags",
    icon: "👜",
    title: "Swarovski Handbags",
    blurb: "Dazzling statement pieces guests adore.",
    image: {
      // Deliberately an unbranded studio photograph. Do not swap in a shot of a
      // competitor-branded bag: it misrepresents the product and uses a third
      // party's trademark.
      src: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=70",
      alt: "Pastel pink handbag on a white studio pedestal, representing the crystal-embellished handbags available for silent auctions",
    },
    heading: "Crystal Handbags for Charity Auctions",
    intro:
      "Crystal-embellished handbags photograph exceptionally well and draw guests toward a table. They work as a mid-tier lot that lifts the average bid across a silent auction.",
    seo: {
      title: "Crystal & Swarovski Handbags for Auctions | CharityWorks",
      description:
        "Crystal-embellished handbags for nonprofit silent auctions and galas. Offered on consignment with no upfront cost to your organization.",
      targetTerms: [
        "handbags for charity auction",
        "silent auction items for nonprofits",
        "gala auction ideas",
      ],
      path: "/auction-items/handbags",
    },
    generalOnly: true,
    groups: [
      {
        id: "handbags-all",
        items: [
          {
            id: "handbags-crystal",
            name: "Crystal-Embellished Handbags",
            description:
              "Evening and day bags finished with crystal detailing, supplied with a dust bag.",
          },
        ],
      },
    ],
  },
  {
    id: "item-meet-greets",
    slug: "meet-and-greets",
    icon: "🎤",
    title: "Meet & Greets",
    blurb: "Priceless access bidders pay whatever it takes for.",
    image: {
      // Also chosen for having no burned-in price starburst.
      src: "/images/catalog/trips/trip_20_food-and-beverages-included.jpg",
      alt: "Andrea Bocelli in Concert promotional poster, representing the meet and greet experiences available for charity auctions",
    },
    heading: "Meet & Greet Experiences for Fundraisers",
    intro:
      "Experiences have no retail price a bidder can look up, which is exactly why they perform. When two people in the room both want the same access, the bidding rarely stops where you expect.",
    seo: {
      title: "Celebrity Meet & Greet Auction Experiences | CharityWorks",
      description:
        "Meet and greet auction lots for nonprofits, including Golden State Warriors tickets and Andrea Bocelli backstage access, on risk-free consignment.",
      targetTerms: [
        "meet and greet auction package",
        "celebrity experiences for charity auctions",
        "gala auction ideas",
      ],
      path: "/auction-items/meet-and-greets",
    },
    groups: [{ id: "meet-all", items: meetGreetItems }],
  },
  {
    id: "item-gold-albums",
    slug: "gold-albums",
    icon: "🥇",
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
    icon: "🎸",
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
