# Lot details needed from the client

The catalog pages can now show verified specifics under each lot — certificate
of authenticity, framed dimensions, what is included, lead time, and anything
else worth stating. **The site ships with none of them filled in**, because
every one of these is a claim about goods a nonprofit will resell to its own
donors. Nothing here may be inferred from a photograph, a description, or what
is typical for the category.

A row that has not been supplied is not shown. Partial information is fine —
send what is known per lot and the rest simply stays absent.

## No pricing

**Descriptive facts only. No retail values, price estimates or ranges.** The
site quotes no figure for any individual lot; pricing is a phone conversation.
Please do not send prices expecting them to appear on the page — they will not
be published.

(This is separate from the consignment terms already described elsewhere on the
site — items at 75% of retail, bidding opening at retail. That explains how the
arrangement works, which is a different thing from putting a number on a
specific piece.)

## What the fields are

Free-form label/value pairs, so the useful facts differ by category without
forcing empty rows. Suggested labels, for consistency across the catalog:

| Label | Example value | Notes |
| --- | --- | --- |
| `Authenticity` | "JSA certificate of authenticity included" | Name the authenticator. "Certified" alone says nothing. |
| `Framed size` | "32 × 40 in, framed" | State whether the figure is framed or unframed. |
| `Includes` | "Display case, certificate, easel" | Anything shipped alongside the piece. |
| `Lead time` | "2–3 weeks from confirmation" | What the nonprofit tells its event committee. |
| `Signed by` | "Signed in person at Wembley, 2023" | Where and when, when it is known. |

Any other label works — these are only a starting set.

## Format to send back

A spreadsheet is fine. One row per lot, columns for whichever labels apply:

| Lot | Authenticity | Framed size | Includes | Lead time |
| --- | --- | --- | --- | --- |
| Taylor Swift Hand-Signed Acoustic Guitar | | | | |
| Morgan Wallen Hand-Signed Acoustic Guitar | | | | |

## Lots awaiting details

89 lots across 9 categories. Named lots are in the catalog files under
`src/content/collections/`; the two general categories describe a type rather
than specific stock, so they need category-level wording rather than per-lot
figures.

| Category | Lots | Where the data goes |
| --- | --- | --- |
| Affordable Vacations | 14 | `catalog-trips.ts` → `vacationItems` |
| Bucket List Trips | 11 | `catalog-trips.ts` → `bucketListItems` |
| Meet & Greets | 2 | `catalog-trips.ts` → `meetGreetItems` |
| Hand-Signed Guitars | 9 | `catalog-guitars.ts` |
| Sports & Celebrity Memorabilia | 27 | `catalog-memorabilia.ts` |
| Gold Album Showcases | 21 | `catalog-gold-albums.ts` |
| Taylor Swift Signed Guitar | 2 | `auction-items.ts` (inline) |
| Gemstone & Costume Jewelry | 2 (general) | `auction-items.ts` (inline) |
| Swarovski Handbags | 1 (general) | `auction-items.ts` (inline) |

Memorabilia is the only category split into tiers, and the split matters — a
hand-signed piece and a laser-signature reproduction are different products and
need different answers:

| Tier | Lots | What it most needs |
| --- | --- | --- |
| Hand-signed jerseys | 12 | Authenticator name and certificate number |
| Hand-signed music | 4 | Authenticator name, where and when signed |
| Reproduction / laser signature | 11 | Plain wording that it is a reproduction |

### Priority

Travel and the signed guitars are the highest-value lots and the ones a
committee is most likely to ask about before committing, so those 38 are worth
collecting first. The 12 hand-signed jerseys come next: they are the lots where
a buyer is most likely to ask who authenticated the signature. The gold albums
are the largest single block but the most uniform — one set of answers may well
cover all 21.

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
    { label: "Includes", value: "Certificate, hard case" },
    { label: "Lead time", value: "2–3 weeks from confirmation" },
  ],
},
```

The type is `ItemDetail` in `src/content/types.ts`. In Phase 2 these become
editable rows in the admin panel rather than a code change.

## One thing to check before publishing

Authentication claims are what a bidder relies on when deciding what to pay,
and what an auditor looks at afterwards. "JSA certified" and "certificate
included" are different statements, and a bidder will read the first as the
second. Confirm the client can produce the paperwork behind each one as
worded — once it is on the page it is a representation to every donor who bids.
