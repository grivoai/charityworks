/**
 * The wording and prices on /guitar-prices, a hidden page.
 *
 * Copied from Lauri's "Guitar Price Page.docx" (Nov 2026), which holds the old
 * charityworks.net/guitar-prices page as text plus five screenshots. Every
 * sentence and every price here is from that document; only doubled spaces
 * were collapsed. The order is the old page's: a row of two guitars, then the
 * fundraising text that sat under that row.
 *
 * In the code, not the admin. A new built-in page in the admin means a schema,
 * a seed document, a database row and an editing screen; the client-built page
 * type has no block for a priced guitar card. Change the wording or a price
 * here and redeploy.
 *
 * The photographs are the catalog's own copies of the same guitars
 * (public/images/catalog/guitars), matched to the screenshots one by one.
 */

const DIR = "/images/catalog/guitars";

export interface PricedGuitar {
  id: string;
  /** The first line of the card, e.g. "Taylor Swift Image". */
  name: string;
  /** The line under the name. */
  kind: string;
  /** As printed, e.g. "$975". */
  price: string;
  image: { src: string; alt: string };
}

/** Text that followed a row of guitars. */
export interface GuitarSection {
  heading?: string;
  paragraphs: string[];
  /** Bullets that follow the paragraphs. */
  bullets?: string[];
  /** Shown after `bullets` (the "three ways" line comes after its paragraphs). */
  afterBullets?: string[];
  /** Whether the "Download PDF" guide button sat in this section. */
  guide?: { lead: string };
  /** A large inline list, as "• Silent Auction • Live Auction • Raffle". */
  ways?: { lead: string; items: string[] };
}

export interface GuitarRow {
  guitars: [PricedGuitar, PricedGuitar];
  after: GuitarSection;
}

const KIND = "Hand-Signed Acoustic Guitar";

export const guitarPrices = {
  seo: {
    title: "Guitar Prices",
    description:
      "Charity prices for CharityWorks' hand-signed acoustic guitars, supplied on consignment.",
  },

  about: {
    heading: "About These Guitars",
    paragraphs: [
      "This collectible acoustic guitar measures approximately 38 inches in length and features a hand-signed CD cover that has been repurposed as a pickguard and professionally mounted to a real acoustic guitar.",
      "Please note that this is a display and collectible item. While it is a genuine 38-inch acoustic guitar it was not used or played by the featured performer and is not intended to represent a stage-played instrument.",
      "The signature has been authenticated by JSA (James Spence Authentication), one of the world's leading third-party autograph authentication companies. Each guitar includes a tamper-evident JSA authentication hologram affixed to the item, and the autograph can be verified in the JSA online database.",
    ],
    verify: {
      lead: "To verify the authentication, visit:",
      href: "https://www.spenceloa.com/verify-authenticity",
    },
    closing: [
      "All of our hand-signed autographs are 100% authentic and have been independently verified by a trusted third-party authentication service. Colors of guitars may vary based on availability at the time of order.",
      "CharityWorks is one of the leading suppliers to fundraisers around the USA, of hand-signed guitars.",
      "All items on Consignment. No upfront costs to you or your Charity. If items don't sell you are responsible for the shipping to return.",
    ],
  },

  priceLabel: "Charity Price",
  consignmentLabel: "(Consignment)",

  rows: [
    {
      guitars: [
        {
          id: "taylor-swift-image",
          name: "Taylor Swift Image",
          kind: KIND,
          price: "$975",
          image: {
            src: `${DIR}/guitar_01_taylor-swift.jpg`,
            alt: "Black acoustic guitar printed with a concert photograph of Taylor Swift, with her signature on the pickguard",
          },
        },
        {
          id: "morgan-wallen",
          name: "Morgan Wallen",
          kind: KIND,
          price: "$950",
          image: {
            src: `${DIR}/guitar_02_morgan-wallen.jpg`,
            alt: "Sunburst acoustic guitar hand-signed by Morgan Wallen with a photo pickguard",
          },
        },
      ],
      after: {
        heading: "Using Hand-Signed Guitars to Maximize Fundraising Revenue",
        paragraphs: [
          "Hand-signed and authenticated guitars can become powerful fundraising assets when positioned correctly. Beyond being collectible memorabilia, they create excitement, encourage participation, and generate meaningful revenue for your event.",
        ],
        guide: {
          lead: "Download our guide on how to best use these hand-signed guitars for your fundraiser.",
        },
        ways: {
          lead: "There are three primary ways to use signed guitars at fundraising events:",
          items: ["Silent Auction", "Live Auction", "Raffle"],
        },
      },
    },
    {
      guitars: [
        {
          id: "ed-sheeran",
          name: "Ed Sheeran",
          kind: KIND,
          price: "$900",
          image: {
            src: `${DIR}/guitar_03_ed-sheeran.jpg`,
            alt: "Natural-finish acoustic guitar hand-signed by Ed Sheeran on a yellow pickguard",
          },
        },
        {
          id: "luke-combs",
          name: "Luke Combs",
          kind: KIND,
          price: "$950",
          image: {
            src: `${DIR}/guitar_04_luke-combs.jpg`,
            alt: "Sunburst acoustic guitar hand-signed by Luke Combs with an album-art pickguard",
          },
        },
      ],
      after: {
        paragraphs: [
          "A SILENT AUCTION is one of the easiest and most effective ways to showcase a hand-signed guitar. Guests are naturally drawn to collectible items, and signed guitars often spark emotional connections and conversations.",
        ],
      },
    },
    {
      guitars: [
        {
          id: "ozzy-osbourne",
          name: "Ozzy Osbourne",
          kind: KIND,
          price: "$1275",
          image: {
            src: `${DIR}/guitar_05_ozzy-osbourne.jpg`,
            alt: "Sunburst acoustic guitar hand-signed by Ozzy Osbourne with a Patient Number 9 pickguard",
          },
        },
        {
          id: "bruce-springsteen",
          name: "Bruce Springsteen",
          kind: KIND,
          price: "$1600",
          image: {
            src: `${DIR}/guitar_06_bruce-springsteen.jpg`,
            alt: "Black acoustic guitar hand-signed by Bruce Springsteen, with an American flag on the body",
          },
        },
      ],
      after: {
        paragraphs: [
          "LIVE AUCTIONS introduce a completely different energy and often create the highest upside potential. Success with signed guitars in a live setting generally depends on three factors:",
        ],
        bullets: [
          "Audience size",
          "Historical performance of your live auction segment",
          "The skill of your auctioneer and room engagement",
        ],
      },
    },
    {
      guitars: [
        {
          id: "carrie-underwood",
          name: "Carrie Underwood",
          kind: KIND,
          price: "$750",
          image: {
            src: `${DIR}/guitar_07_carrie-underwood.jpg`,
            alt: "Black acoustic guitar hand-signed by Carrie Underwood on a pale pink pickguard",
          },
        },
        {
          id: "jon-bon-jovi",
          name: "Jon Bon Jovi",
          kind: KIND,
          price: "$750",
          image: {
            src: `${DIR}/guitar_08_jon-bon-jovi.jpg`,
            alt: "Natural-finish acoustic guitar hand-signed by Jon Bon Jovi with a black-and-white photo pickguard",
          },
        },
      ],
      after: {
        paragraphs: [
          "Surprisingly, RAFFLES are often the most successful revenue stream for hand-signed guitars.",
          "If your first thought is, “Our state doesn’t allow raffles,” there may still be compliant options available depending on your nonprofit status and event structure.",
        ],
      },
    },
    {
      guitars: [
        {
          id: "elton-john",
          name: "Elton John",
          kind: KIND,
          price: "$1500",
          image: {
            src: `${DIR}/guitar_09_elton-john.jpg`,
            alt: "Sunburst acoustic guitar hand-signed by Elton John with a photo pickguard",
          },
        },
        {
          id: "taylor-swift",
          name: "Taylor Swift",
          kind: KIND,
          price: "$975",
          image: {
            src: `${DIR}/guitar_10_taylor-swift.jpg`,
            alt: "Sunburst acoustic guitar hand-signed by Taylor Swift on a black-and-white photo pickguard",
          },
        },
      ],
      after: {
        heading: "Ready to maximize your fundraising with guitars?",
        paragraphs: [],
      },
    },
  ] satisfies GuitarRow[],

  /** The closing section's guide line, split around the guide's title. */
  closingGuide: {
    before: "Download our detailed guide",
    title: "(Hand-Signed Guitars - Fundraising Info)",
    after: "and see how your organization can raise more while offering supporters something they'll love.",
  },

  booking: {
    label:
      "Click here to book your free 30 minutes to answer questions and offer guidance for your fundraiser.",
    href: "https://calendly.com/iraklein82/30min",
  },

  /**
   * The guide PDF the two "Download PDF" buttons opened. It is not in the
   * document, and no document by this address has been uploaded yet, so the
   * guide lines and their buttons are left off the page until one is. Upload
   * the PDF in the admin's Documents titled "Hand-Signed Guitars - Fundraising
   * Info" (the address it suggests is this one) and they appear as soon as it
   * is saved: saving a document refreshes DOCUMENTS_TAG, which this page reads
   * through getDocumentSlugs. No code change, no deploy.
   */
  guideDocumentSlug: "hand-signed-guitars-fundraising-info",
  guideButton: "Download PDF",
};
