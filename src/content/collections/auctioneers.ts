import type { Auctioneer, Partner } from "../types";

const DIR = "/images/catalog/auctioneers";

/**
 * The real auctioneer roster, transcribed from charityworks.net/auctioneers.
 *
 * PHOTO MATCHING: the filenames in public/images/catalog/auctioneers are not
 * reliable — ten of the eleven describe the wrong person, because the scraper
 * captioned each image with whatever text sat nearest it. Three separate files
 * are named "tony-shaw" and only one of them is Tony Shaw. The mapping below
 * was established by matching each local file to the live page's images by
 * exact pixel dimensions in document order, then confirming that each name
 * heading sits within ~6px of its image, then eyeballing every photograph
 * against its bio. Do not "correct" these paths to match the filenames.
 *
 * Wording is the client's own, with obvious spelling and grammar slips fixed
 * (see README for the list). Territories appear only where the client
 * publishes one.
 */
export const auctioneers: Auctioneer[] = [
  {
    id: "auc-david-aahl",
    name: "David Aahl",
    initials: "DA",
    territory: "Northern California",
    credential: "Senior Auctioneer / Consultant",
    accolade: "Million Dollar Paddle Raise",
    tagline: "Driven by Passion, Fueled by Experience — Maximizing Nonprofit Fundraising",
    bio: [
      "David Aahl's love for auctions started at an early age, attending auctions with his father and becoming fascinated by the thrill of the bidding process. After graduating from the Missouri School of Auctioneering in 1993, he built a successful career selling collector cars, real estate, airplanes, and more.",
      "David's true passion lies in nonprofit fundraising, where his energy, precision, and commitment to excellence set him apart. Known for his attention to detail and ability to create a fun, engaging atmosphere, he works closely with organizations to maximize their fundraising potential.",
      "Outside the auction world, David enjoys spending time with his son and daughter, restoring his beloved 1967 Mustang, and attending professional sporting events.",
    ],
    image: {
      src: `${DIR}/auctioneer_01_territory-northern-california.jpg`,
      alt: "David Aahl in a blue blazer calling an auction in front of a seated audience",
    },
  },
  {
    id: "auc-beto-beas",
    name: "Beto Beas",
    initials: "BB",
    // Client's page reads "Nothern California"; corrected.
    territory: "Northern California & Central California",
    credential: "Bi-lingual Auctioneer Specialist",
    tagline: "Elevating Charity Auctions with Passion & Expertise",
    bio: [
      "Beto Beas is a professional auctioneer dedicated to helping charities and nonprofits exceed their fundraising goals. A graduate of the prestigious Missouri Auction School, Beto has mastered the art of benefit auctions, bringing energy, excitement, and a results-driven approach to every event.",
      "As a key member of BBB Auctions, Beto specializes in first-class auction services for galas, charity events, and silent auctions. His dynamic presence ensures that every donor is engaged, every bid counts, and every cause receives the support it deserves.",
      "With a deep passion for philanthropy and a commitment to excellence, Beto serves organizations across Northern and Central California, turning fundraising visions into reality — one auction at a time.",
      "Let's make your next event a record-breaking success!",
    ],
    image: {
      src: `${DIR}/auctioneer_03_bilingual-auctioneer-specialist.jpg`,
      alt: "Studio portrait of auctioneer Beto Beas wearing a tan suit and tie",
    },
  },
  {
    id: "auc-grayson-haydn-myer",
    name: "Grayson Haydn-Myer",
    initials: "GH",
    territory: "Northern California & Central California",
    tagline: "From Ranch Roots to Fundraising Excellence",
    bio: [
      "Grayson Haydn-Myer's journey into auctioneering began at just nine years old while working on her family's cattle operation. That early experience ignited a lifelong passion that has since evolved into a thriving career in charity benefit auctions.",
      "Each year, Grayson takes on 40 to 50 fundraising events, delivering maximum results for her clients. From pre-event planning to the final gavel, she ensures every detail is handled seamlessly. Her engaging style not only drives donations but also creates a memorable experience for attendees.",
      "Dedicated to making fundraising stress-free and successful, Grayson works tirelessly to help organizations exceed their goals — one auction at a time.",
    ],
    image: {
      src: `${DIR}/auctioneer_04_territory-northern-california-central-california.jpg`,
      alt: "Auctioneer Grayson Haydn-Myer in a white cowboy hat speaking into a microphone at an event",
    },
  },
  {
    id: "auc-frank-jakubka",
    name: 'Frank "Big Frank" Jakubka',
    initials: "FJ",
    territory: "Northern California",
    tagline: "Bringing Energy, Humor & Impact to Charity Auctions",
    bio: [
      'For over 25 years, Frank "Big Frank" Jakubka has been captivating audiences as a professional auctioneer, known for his high-energy style and infectious humor. Specializing in live auction fundraising, Frank expertly engages crowds and drives participation to ensure record-breaking results.',
      "He has worked with major charities, including the NFL Alumni Association and Ronald McDonald House, but his true passion is raising funds for children's initiatives. His dedication has helped generate millions for kids' charities across the country.",
      "Beyond the auction stage, Frank is a Master of Wine and Spirits, serving as a National Spirits Manager for The Gallo Companies.",
    ],
    image: {
      src: `${DIR}/auctioneer_05_territory-northern-california.jpg`,
      alt: 'Auctioneer Frank "Big Frank" Jakubka in a tuxedo and bow tie at a black-tie event',
    },
  },
  {
    id: "auc-gil-hyder",
    name: "Gil Hyder",
    initials: "GY",
    territory: "Southern California",
    tagline: "Enthusiasm. Professionalism. Results.",
    bio: [
      "With over three decades in the auction industry, Gil Hyder has mastered the art of fundraising auctioneering. His career began in 1992, inspired by a close friend, and after graduating from the Missouri Auction School in 1993, he quickly rose to executive management positions in the field.",
      "Gil's electrifying presence and deep connection with audiences make him a standout at fundraising events. His ability to create excitement, combined with his humor and sincerity, has earned him praise from countless nonprofit organizations.",
      "Originally from California's Bay Area, Gil has served in the U.S. Marine Corps and lived in Hawaii, Seattle, and San Diego. In his free time, he enjoys surfing, soccer, swimming, and traveling.",
    ],
    image: {
      src: `${DIR}/auctioneer_06_territory-northern-california.jpg`,
      alt: "Studio portrait of auctioneer Gil Hyder wearing a navy suit and light blue shirt",
    },
  },
  {
    id: "auc-sal-castaneda",
    name: "Sal Castaneda",
    initials: "SC",
    // No territory published for Sal on the client's page.
    tagline: "Charity Benefit Host & Emmy Award-Winning Broadcaster",
    bio: [
      "In addition to being a charity benefit host and auctioneer, Sal is most recognized for his on-air work at KTVU. He was also a contributor to Mornings on 2 starting in the early 1990s, and before settling in at KTVU, Sal worked for various radio and TV stations in the Bay Area.",
      "Sal has covered many different stories both as a traffic reporter and as a general assignment news reporter. Sal won an Emmy Award for his coverage of the 2014 Napa Earthquake. He also covered the opening of the new Bay Bridge Eastern Span and won a breaking news award from the Associated Press for that coverage.",
      "A San Francisco native, Sal attended Archbishop Riordan High School in San Francisco and graduated from U.C. Berkeley with a degree in Political Science. He especially enjoyed his time at Cal, living on and near campus in Berkeley.",
      "Sal loves being in the Bay Area because his extended family is here. He enjoys working in the community where he grew up and drawing on local knowledge and connections to help tell a story.",
    ],
    image: {
      src: `${DIR}/auctioneer_07_territory-northern-california.jpg`,
      alt: "Broadcaster and charity benefit host Sal Castaneda speaking into a handheld microphone at an outdoor event",
    },
  },
  {
    id: "auc-brittany-trammell",
    name: "Brittany Trammell",
    initials: "BT",
    // No territory published for Brittany on the client's page.
    tagline: "Benefit Auctioneer Specialist & Charity Fundraising Host",
    bio: [
      // "female Benefit Auctioneer Specialist" is the client's own wording and
      // is kept: female BAS is a marketed specialty in this industry, so
      // dropping it would remove positioning rather than fix an error.
      "Brittany Trammell is a female Benefit Auctioneer Specialist, charity fundraising host and MC, and member of the National Auctioneers Association who brings an energizing blend of performance expertise, nonprofit leadership, and heartfelt connection to every event. Known for her dynamic stage presence and authentic delivery, she helps nonprofits across California and beyond exceed their fundraising goals with energy, strategy, and purpose.",
      "Brittany's background as a trained dancer with the Joffrey Ballet and Stanley Holden Dance Company, along with 17 years performing with Cheer San Francisco, gives her a commanding stage presence and a natural ability to connect with audiences. Her years of live performance have honed her timing, charisma, and intuition — skills she now channels into the auction spotlight, creating mission-driven moments that inspire generosity and bring communities together.",
    ],
    image: {
      src: `${DIR}/auctioneer_08_tony-shaw.jpg`,
      alt: "Auctioneer Brittany Trammell holding a microphone while hosting a fundraising event",
    },
  },
  {
    id: "auc-nicole-cowan",
    name: "Nicole Cowan",
    initials: "NC",
    territory: "United States",
    tagline: "Innovative. Engaging. Results-Driven.",
    bio: [
      "Nicole Cowan brings a refreshing, dynamic approach to benefit auctioneering, blending expertise with an engaging and fun style. With a background spanning auto and livestock auctions, over a decade in the nonprofit sector, and 14 years as a professional Hungarian folk dancer, Nicole offers a truly unique perspective on fundraising.",
      "Having participated in hundreds of charity galas, Nicole leverages her deep industry knowledge to help organizations elevate their events and maximize their profits. Her strategic insights and high-energy presence make her a sought-after auctioneer in the nonprofit world.",
    ],
    image: {
      src: `${DIR}/auctioneer_09_tony-shaw.jpg`,
      alt: "Portrait of auctioneer Nicole Cowan wearing a red blazer",
    },
  },
  {
    id: "auc-tony-shaw",
    name: "Tony Shaw",
    initials: "TS",
    territory: "Southern California & Bakersfield",
    credential: "CharityWorks Southern California Partner",
    tagline: "Elevating Nonprofit Fundraising Through Premier Auctions",
    bio: [
      "Tony Shaw is a seasoned expert in benefit galas, live auctions, and virtual fundraising events, specializing in high-impact auction strategies for charitable organizations.",
      "With a proven track record of helping nonprofits raise millions, Tony brings unparalleled expertise to charity auctions, golf tournaments, and benefit fashion shows. As a dynamic emcee, he captivates audiences, ensuring fundraising success with his engaging presence.",
      "Tony's hands-on approach allows him to provide personalized guidance to each organization he partners with. Before joining CharityWorks, he spent 20 years as an award-winning high school administrator and college counselor, demonstrating his lifelong dedication to helping others.",
    ],
    image: {
      src: `${DIR}/auctioneer_10_tony-shaw.jpg`,
      alt: "Studio portrait of auctioneer Tony Shaw in a dark blazer against a blue background",
    },
  },
];

/**
 * Featured partners. Kept out of the auctioneer roster on purpose: West Coast
 * Events is an event planning and catering company, and listing a caterer
 * among "elite charity auctioneers" reads as a roster error.
 */
export const auctioneerPartners: Partner[] = [
  {
    id: "partner-west-coast-events",
    name: "West Coast Events / Gina Longmire",
    role: "Professional Event Planning & Catering",
    bio: [
      "At West Coast Events Group, we believe every event should be more than just a gathering — it should be an unforgettable experience.",
      "Whether you're planning an elegant wedding, corporate event, gala, golf tournament, holiday celebration, fundraiser, private dinner, or family milestone, our team is here to bring your vision to life while allowing you to be a guest at your own event.",
      "As the Exclusive Event Planning & Catering Company of the Blackhawk Museum, we have the privilege of producing hundreds of events each year at one of the Bay Area's most spectacular venues. From intimate celebrations to events for more than 1,000 guests, we specialize in creating seamless, elevated experiences surrounded by world-class exhibits and breathtaking architecture.",
      "Not hosting your event at the Museum? No problem. Our team also provides full-service off-site catering and event production throughout Northern California and beyond — from private residences and wineries to country clubs, corporate offices, parks, and unique venues.",
    ],
    closer: "Your Vision. Our Expertise. An Unforgettable Event.",
    image: {
      src: `${DIR}/auctioneer_11_west-coast-events-gina-longmire.jpg`,
      alt: "Portrait of Gina Longmire of West Coast Events, event planning and catering partner",
    },
  },
];
