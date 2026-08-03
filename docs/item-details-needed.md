# Lot details needed from the client

The catalog pages can now show verified specifics under each lot — certificate
of authenticity, framed dimensions, retail value, lead time, and anything else
worth stating. **The site ships with none of them filled in**, because every
one of these is a claim about goods a nonprofit will resell to its own donors.
Nothing here may be inferred from a photograph, a description, or what is
typical for the category.

A row that has not been supplied is not shown. Partial information is fine —
send what is known per lot and the rest simply stays absent.

## What the fields are

Free-form label/value pairs, so the useful facts differ by category without
forcing empty rows. Suggested labels, for consistency across the catalog:

| Label | Example value | Notes |
| --- | --- | --- |
| `Authenticity` | "JSA certificate of authenticity included" | Name the authenticator. "Certified" alone says nothing. |
| `Retail value` | "$3,500" | The figure the client is willing to stand behind, since it anchors bidding. |
| `Framed size` | "32 × 40 in, framed" | State whether the figure is framed or unframed. |
| `Lead time` | "2–3 weeks from confirmation" | What the nonprofit tells its event committee. |
| `Includes` | "Display case, certificate, easel" | Anything shipped alongside the piece. |

Any other label works — these are only a starting set.

## Format to send back

A spreadsheet is fine. One row per lot, columns for whichever labels apply:

| Lot | Authenticity | Retail value | Framed size | Lead time |
| --- | --- | --- | --- | --- |
| Taylor Swift Hand-Signed Acoustic Guitar | | | | |
| Morgan Wallen Hand-Signed Acoustic Guitar | | | | |

## Lots awaiting details

77 lots across 9 categories. Named lots are in the catalog files under
`src/content/collections/`; the two general categories describe a type rather
than specific stock, so they need category-level wording rather than per-lot
figures.

| Category | Lots | Where the data goes |
| --- | --- | --- |
| Affordable Vacations | 14 | `catalog-trips.ts` → `vacationItems` |
| Bucket List Trips | 11 | `catalog-trips.ts` → `bucketListItems` |
| Meet & Greets | 2 | `catalog-trips.ts` → `meetGreetItems` |
| Hand-Signed Guitars | 9 | `catalog-guitars.ts` |
| Sports & Celebrity Memorabilia | 15 | `catalog-memorabilia.ts` |
| Gold Album Showcases | 21 | `catalog-gold-albums.ts` |
| Taylor Swift Signed Guitar | 2 | `auction-items.ts` (inline) |
| Gemstone & Costume Jewelry | 2 (general) | `auction-items.ts` (inline) |
| Swarovski Handbags | 1 (general) | `auction-items.ts` (inline) |

### Priority

Travel and the signed guitars are the highest-value lots and the ones a
committee is most likely to ask about before committing, so those 34 are worth
collecting first. The gold albums are the largest block but the most uniform —
one set of answers may well cover all 21.

## How to add them

Add a `details` array to any item in the catalog files:

```ts
{
  id: "guitar-taylor-swift",
  name: "Taylor Swift Hand-Signed Acoustic Guitar",
  description: "…",
  image: { … },
  details: [
    { label: "Authenticity", value: "JSA certificate of authenticity included" },
    { label: "Retail value", value: "$3,500" },
    { label: "Lead time", value: "2–3 weeks from confirmation" },
  ],
},
```

The type is `ItemDetail` in `src/content/types.ts`. In Phase 2 these become
editable rows in the admin panel rather than a code change.

## One thing to check before publishing

Retail values and authentication claims are what a bidder relies on when
deciding what to pay, and what an auditor looks at afterwards. Confirm the
client is willing to stand behind each figure as published, rather than treating
them as indicative — once they are on the page they are a representation to
every donor who bids.
