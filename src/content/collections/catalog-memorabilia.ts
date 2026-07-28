import type { CategoryGroup } from "../types";

const DIR = "/images/catalog/memorabilia";

/** Client-required wording on every framed jersey lot. */
const JERSEY_NOTE =
  "Jersey may vary slightly based on availability at time of event.";

const jersey = (
  id: string,
  player: string,
  team: string,
  file: string,
  colour: string,
  extra?: string
) => ({
  id: `memo-${id}`,
  name: `${player} — ${team} Hand-Signed Framed Jersey`,
  description:
    extra ??
    `Authentic ${team} jersey hand-signed by ${player}, professionally framed with accompanying action photography.`,
  image: {
    src: `${DIR}/${file}`,
    alt: `${colour} ${team} jersey hand-signed by ${player}, framed with action photographs, offered as a charity auction lot`,
  },
  note: JERSEY_NOTE,
});

/**
 * Sports and celebrity memorabilia. Real client inventory, photographed by the
 * client.
 *
 * Split into three groups on purpose. The reproduced / laser-signature tier is
 * a materially different and cheaper product from the hand-signed pieces, so
 * it is kept visually separate and labelled rather than mixed into one list —
 * a bidder must be able to tell which they are bidding on.
 */
export const memorabiliaGroups: CategoryGroup[] = [
  {
    id: "memo-group-jerseys",
    title: "Hand-Signed Framed Jerseys",
    blurb:
      "Each jersey is hand-signed and professionally framed with accompanying photography, ready to display at your event.",
    items: [
      jersey("kittle", "George Kittle", "San Francisco 49ers", "memorabilia_01_george-kittle-49ers-handsigned-framed-jersey.jpg", "Red and gold"),
      jersey("mccaffrey", "Christian McCaffrey", "San Francisco 49ers", "memorabilia_02_christian-mccaffrey-49ers-handsigned-framed-jersey.jpg", "Red and gold"),
      jersey("purdy", "Brock Purdy", "San Francisco 49ers", "memorabilia_03_brock-purdy-49ers-handsigned-framed-jersey.jpg", "Red and gold"),
      jersey("curry", "Stephen Curry", "Golden State Warriors", "memorabilia_04_stephen-curry-warriors-handsigned-framed-jersey.jpg", "Blue and gold"),
      jersey("crosby", "Maxx Crosby", "Las Vegas Raiders", "memorabilia_05_maxx-crosby-raiders-handsigned-framed-jersey.jpg", "Black and silver"),
      jersey("bowers", "Brock Bowers", "Las Vegas Raiders", "memorabilia_06_brock-bowers-raiders-handsigned-framed-jersey.jpg", "Black and silver"),
      jersey("posey", "Buster Posey", "San Francisco Giants", "memorabilia_07_buster-posey-handsigned-framed-jersey.jpg", "Cream and orange"),
      jersey("webb", "Logan Webb", "San Francisco Giants", "memorabilia_08_logan-webb-giants-handsigned-framed-jersey.jpg", "Cream and orange"),
      jersey("crawford", "Brandon Crawford", "San Francisco Giants", "memorabilia_09_brandon-crawford-giants-handsigned-framed-jersey.jpg", "Cream and orange"),
      {
        id: "memo-ohtani-card",
        name: "Shohei Ohtani — Los Angeles Dodgers Hand-Signed Card with Framed Jersey",
        description:
          "Dodgers jersey professionally framed together with a hand-signed Shohei Ohtani card.",
        image: {
          src: `${DIR}/memorabilia_10_shohei-ohtani-dodgers-handsigned-card-wframed-jers.jpg`,
          alt: "White Los Angeles Dodgers Ohtani jersey framed together with a hand-signed card, offered as a charity auction lot",
        },
        note: JERSEY_NOTE,
      },
      {
        id: "memo-ohtani-5050",
        name: "Shohei Ohtani — Dodgers 50/50 Commemorative with Hand-Signed Card",
        description:
          "Commemorative display marking Shohei Ohtani's 50/50 season, presented with a hand-signed card.",
        image: {
          src: `${DIR}/memorabilia_11_shohei-ohtani-dodgers-5050-comm-w-handsigned-card.jpg`,
          alt: "Shohei Ohtani Dodgers 50/50 season commemorative display with a hand-signed card, a charity auction lot",
        },
      },
      jersey("celebrini", "Macklin Celebrini", "San Jose Sharks", "memorabilia_12_macklin-celebrini-sharks-handsigned-jersey.jpg", "Teal and black"),
    ],
  },
  {
    id: "memo-group-music",
    title: "Hand-Signed Music Commemoratives",
    blurb:
      "Framed album and CD presentations carrying genuine hand signatures.",
    items: [
      {
        id: "memo-swift-deluxe-cd",
        name: "Taylor Swift — Hand-Signed Deluxe CD Commemorative",
        description:
          "Deluxe framed presentation built around a hand-signed Taylor Swift CD, with tour photography.",
        image: {
          src: `${DIR}/memorabilia_17_taylor-swift-handsigned-deluxe-cd-commemorative.jpg`,
          alt: "Framed Taylor Swift deluxe CD commemorative with a hand signature and tour photographs, a charity auction lot",
        },
      },
      {
        id: "memo-swift-cd",
        name: "Taylor Swift — Hand-Signed CD Commemorative",
        description:
          "Framed Taylor Swift CD commemorative carrying a genuine hand signature.",
        image: {
          src: `${DIR}/memorabilia_18_taylor-swift-handsigned-cd-commemorative.jpg`,
          alt: "Framed Taylor Swift CD commemorative with hand signature and portrait photographs, offered as a fundraiser auction lot",
        },
      },
      {
        id: "memo-springsteen-album",
        name: "Bruce Springsteen — Hand-Signed Deluxe Album Commemorative",
        description:
          "Born in the U.S.A. deluxe framed commemorative carrying a genuine hand signature.",
        image: {
          src: `${DIR}/memorabilia_19_bruce-springsteen-handsigned-deluxe-album-commemor.jpg`,
          alt: "Framed Bruce Springsteen Born in the U.S.A. deluxe album commemorative with hand signature, a charity auction lot",
        },
      },
      {
        id: "memo-santana-cd",
        name: "Carlos Santana — Commemorative with Hand-Signed CD",
        description:
          "Framed Santana commemorative presented with a hand-signed CD.",
        image: {
          src: `${DIR}/memorabilia_20_carlos-santana-commemorative-w-handsigned-cd.jpg`,
          alt: "Framed Carlos Santana commemorative display presented with a hand-signed CD, offered as a charity auction lot",
        },
      },
    ],
  },
  {
    id: "memo-group-reproduction",
    title: "Reproduced / Laser Signature Pieces",
    blurb:
      "A lower-priced tier. Signatures on these pieces are reproduced rather than hand-signed, which makes them well suited to silent auction tables and mid-range bidding.",
    items: [
      {
        id: "memo-giants-greats",
        name: "SF Giants All-Time Greats 11x14 (with Posey)",
        description:
          "Framed 11x14 celebrating the Giants' all-time greats, including Buster Posey, with reproduced signatures.",
        image: {
          src: `${DIR}/memorabilia_21_sf-giants-all-time-greats-11x14-w-posey.jpg`,
          alt: "Framed San Francisco Giants All-Time Greats 11 by 14 print with reproduced signatures, a charity auction lot",
        },
      },
      {
        id: "memo-as-legends",
        name: "Oakland A's 5 Legendary Players 11x14",
        description:
          "Framed 11x14 featuring five Oakland A's legends with reproduced signatures.",
        image: {
          src: `${DIR}/memorabilia_22_oakland-as-5-legendary-players-11x14-w.jpg`,
          alt: "Framed Oakland A's five legendary players 11 by 14 print with reproduced signatures, offered as a charity auction lot",
        },
      },
      {
        id: "memo-curry-crossover",
        name: 'Stephen Curry "Cross-Over" 11x14',
        description:
          "Framed 11x14 action print of Stephen Curry's cross-over, with a reproduced signature.",
        image: {
          src: `${DIR}/memorabilia_23_stephen-curry.jpg`,
          alt: "Framed Stephen Curry cross-over action print in a blue mount with reproduced signature, a charity auction lot",
        },
      },
      {
        id: "memo-green-kick",
        name: 'Draymond Green "The Kick" 11x14',
        description:
          "Framed 11x14 action print of Draymond Green, with a reproduced signature.",
        image: {
          src: `${DIR}/memorabilia_24_draymond-green.jpg`,
          alt: "Framed Draymond Green action print in a blue mount with reproduced signature, offered as a fundraiser auction lot",
        },
      },
      {
        id: "memo-warriors-greats",
        name: "Warriors All-Time Greats (with Curry)",
        description:
          "Framed Golden State Warriors all-time greats display including Stephen Curry, with reproduced signatures.",
        image: {
          src: `${DIR}/memorabilia_25_warriors-all-time-greats.jpg`,
          alt: "Framed Golden State Warriors All-Time Greats print including Stephen Curry with reproduced signatures, a charity auction lot",
        },
      },
      {
        id: "memo-warriors-big-three",
        name: "Warriors Big Three 11x14",
        description:
          "Framed 11x14 of the Warriors' big three, with reproduced signatures.",
        image: {
          src: `${DIR}/memorabilia_26_warriors-big-three.jpg`,
          alt: "Framed Golden State Warriors Big Three 11 by 14 action print with reproduced signatures, a charity auction lot",
        },
      },
      {
        id: "memo-49ers-5-stars",
        name: "SF 49ers 5 Stars 11x14",
        description:
          "Framed 11x14 featuring five San Francisco 49ers stars, with reproduced signatures.",
        image: {
          src: `${DIR}/memorabilia_27_sf-49ers-5-stars-w-5.jpg`,
          alt: "Framed San Francisco 49ers five stars 11 by 14 action print with reproduced signatures, offered as a charity auction lot",
        },
      },
      {
        id: "memo-49ers-duo",
        name: "George Kittle & Christian McCaffrey 49ers Duo 11x14",
        description:
          "Framed 11x14 pairing George Kittle and Christian McCaffrey, with reproduced signatures.",
        image: {
          src: `${DIR}/memorabilia_28_george-kittle-christian-mccaffrey-49ers-duo-11x14-.jpg`,
          alt: "Framed 49ers duo 11 by 14 print of George Kittle and Christian McCaffrey with reproduced signatures, a charity auction lot",
        },
      },
      {
        id: "memo-raiders-greats",
        name: "Raiders All-Time Greats 11x14",
        description:
          "Framed 11x14 celebrating Raiders all-time greats including Al Davis, John Madden and Ken Stabler, with reproduced signatures.",
        image: {
          src: `${DIR}/memorabilia_29_raiders-all-time-greats-11x14.jpg`,
          alt: "Framed Raiders All-Time Greats 11 by 14 print featuring Davis, Madden and Stabler with reproduced signatures, a charity auction lot",
        },
      },
      {
        id: "memo-masters-golfers",
        name: "Palmer, Nicklaus & Woods Laser Commemorative",
        description:
          "Framed golf commemorative honouring Arnold Palmer, Jack Nicklaus and Tiger Woods, with laser-reproduced signatures.",
        image: {
          src: `${DIR}/memorabilia_30_palmer-nicklaus-woods.jpg`,
          alt: "Framed golf commemorative featuring Palmer, Nicklaus and Woods with laser-reproduced signatures, a charity auction lot",
        },
      },
      {
        id: "memo-masters-large",
        name: "Masters Champions Commemorative (Large Piece)",
        description:
          "Oversized framed display of Masters champions, each panel carrying a laser-reproduced signature. A wall-filling centrepiece for a golf-focused event.",
        image: {
          src: `${DIR}/memorabilia_31_masters-champions-commemorative-large-piece.jpg`,
          alt: "Large framed Masters champions commemorative made up of many signed panels with laser-reproduced signatures, a charity auction lot",
        },
      },
    ],
  },
];
