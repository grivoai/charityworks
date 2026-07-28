import type { CategoryItem } from "../types";

const DIR = "/images/catalog/guitars";

/**
 * Hand-signed acoustic guitars. Real client inventory, photographed by the
 * client — one file per lot in public/images/catalog/guitars.
 */
export const signedGuitarItems: CategoryItem[] = [
  {
    id: "guitar-taylor-swift",
    name: "Taylor Swift Hand-Signed Acoustic Guitar",
    description:
      "Full-size acoustic finished with Taylor Swift tour artwork across the body and hand-signed on the upper bout.",
    image: {
      src: `${DIR}/guitar_10_taylor-swift.jpg`,
      alt: "Sunburst acoustic guitar hand-signed by Taylor Swift, with a photo inlay on the body, offered as a charity auction item",
    },
  },
  {
    id: "guitar-morgan-wallen",
    name: "Morgan Wallen Hand-Signed Acoustic Guitar",
    description:
      "Sunburst dreadnought hand-signed by Morgan Wallen, with a photo inlay set into the body.",
    image: {
      src: `${DIR}/guitar_02_morgan-wallen.jpg`,
      alt: "Sunburst acoustic guitar hand-signed by Morgan Wallen with a photo inlay on the body, a fundraiser auction lot",
    },
  },
  {
    id: "guitar-ed-sheeran",
    name: "Ed Sheeran Hand-Signed Acoustic Guitar",
    description:
      "Natural-finish acoustic hand-signed by Ed Sheeran, carrying his yellow signature artwork on the body.",
    image: {
      src: `${DIR}/guitar_03_ed-sheeran.jpg`,
      alt: "Natural finish acoustic guitar hand-signed by Ed Sheeran with yellow artwork on the body, a charity auction lot",
    },
  },
  {
    id: "guitar-luke-combs",
    name: "Luke Combs Hand-Signed Acoustic Guitar",
    description:
      "Sunburst acoustic hand-signed by Luke Combs, with a photo inlay set into the body.",
    image: {
      src: `${DIR}/guitar_04_luke-combs.jpg`,
      alt: "Sunburst acoustic guitar hand-signed by Luke Combs with a photo inlay on the body, offered to nonprofits for auction",
    },
  },
  {
    id: "guitar-ozzy-osbourne",
    name: "Ozzy Osbourne Hand-Signed Acoustic Guitar",
    description:
      "Sunburst acoustic hand-signed by Ozzy Osbourne, with artwork applied to the body.",
    image: {
      src: `${DIR}/guitar_05_ozzy-osbourne.jpg`,
      alt: "Sunburst acoustic guitar hand-signed by Ozzy Osbourne with tour artwork on the body, a fundraiser auction lot",
    },
  },
  {
    id: "guitar-bruce-springsteen",
    name: "Bruce Springsteen Hand-Signed Acoustic Guitar",
    description:
      "Black acoustic hand-signed by Bruce Springsteen, with American flag artwork on the upper body.",
    image: {
      src: `${DIR}/guitar_06_bruce-springsteen.jpg`,
      alt: "Black acoustic guitar hand-signed by Bruce Springsteen with American flag artwork on the body, a charity auction lot",
    },
  },
  {
    id: "guitar-carrie-underwood",
    name: "Carrie Underwood Hand-Signed Acoustic Guitar",
    description:
      "Black cutaway acoustic hand-signed by Carrie Underwood across the pickguard.",
    image: {
      src: `${DIR}/guitar_07_carrie-underwood.jpg`,
      alt: "Black cutaway acoustic guitar hand-signed by Carrie Underwood on the pickguard, offered as a fundraiser auction item",
    },
  },
  {
    id: "guitar-jon-bon-jovi",
    name: "Jon Bon Jovi Hand-Signed Acoustic Guitar",
    description:
      "Natural-finish acoustic hand-signed by Jon Bon Jovi, with a band photo inlay on the body.",
    image: {
      src: `${DIR}/guitar_08_jon-bon-jovi.jpg`,
      alt: "Natural finish acoustic guitar hand-signed by Jon Bon Jovi with a band photo inlay on the body, a charity auction lot",
    },
  },
  {
    id: "guitar-elton-john",
    name: "Elton John Hand-Signed Acoustic Guitar",
    description:
      "Sunburst acoustic hand-signed by Elton John, with colourful portrait artwork applied to the body.",
    image: {
      src: `${DIR}/guitar_09_elton-john.jpg`,
      alt: "Sunburst acoustic guitar hand-signed by Elton John with colourful portrait artwork on the body, a fundraiser auction lot",
    },
  },
];
