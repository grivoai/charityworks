# CharityWorks

Marketing site for CharityWorks — consignment auction items and fundraising
consulting for nonprofits.

Next.js (App Router) + TypeScript. Deployed on Vercel.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Routes

Each nav item is its own route so it can be optimised for search individually.

| Route | Targets |
| --- | --- |
| `/` | nonprofit fundraising consultant, charity auction items |
| `/auction-info` | consignment auction items for nonprofits, how charity auctions work |
| `/auction-items` | charity auction items, celebrity signed guitar fundraiser, gala auction ideas |
| `/auctioneers` | charity auctioneer, benefit auctioneer for nonprofit gala |
| `/faqs` | charity auction FAQ |
| `/testimonials` | charity auction results |
| `/contact` | free fundraising plan |
| `/auction-items/[slug]` | one page per category (9), each carrying its own long-tail terms |

The nine category pages are generated from `auctionItems` via
`generateStaticParams`, so adding a category to that collection creates the
route, the sitemap entry and the tile on `/auction-items` with no other change.

### Catalog content

Lots are the client's **real inventory**, with the client's own photography in
`public/images/catalog/`. Copy lives in `src/content/collections/catalog-*.ts`,
one module per source folder, assembled into categories by `auction-items.ts`.

- Categories carry `groups: CategoryGroup[]` rather than a flat item list, so
  tiers stay visually separate. Memorabilia relies on this: hand-signed pieces
  and reproduced/laser-signature pieces are a materially different (and
  differently priced) product, and a bidder must be able to tell them apart.
- Every framed jersey carries the client's required wording, *"Jersey may vary
  slightly based on availability at time of event."*
- Gold albums state in every description that the signature is a laser
  reproduction, for the same reason.
- Jewelry and Swarovski Handbags are `generalOnly: true` — the client lists
  them as categories with no named lots, so those pages describe the category
  rather than claiming stock, and get a different availability notice. They are
  also the only two categories still on stock photography. The handbag image is
  deliberately unbranded; do not swap in a competitor-branded bag.
- Structured data stays `ItemList`, **not** `Product`/`Offer`. Product markup
  asserts a price and availability, and consignment stock has neither a fixed
  price nor guaranteed availability on a given date.

Category and lot photography is rendered through `next/image`. This is not
optional polish: the client's source files run to 5.2MB each (47MB total), and
serving them raw would undo the page-speed side of the SEO work. Measured, the
largest drops from **5.1MB to 74KB** as WebP.

`/sitemap.xml` and `/robots.txt` are generated from the content layer, so a new
page appears in both automatically.

Set `NEXT_PUBLIC_SITE_URL` in the Vercel project to the production domain. It
drives canonical tags, OpenGraph URLs and the sitemap, and defaults to
`https://www.charityworks.net`.

## Leads

Every enquiry on the site posts to one endpoint, `/api/contact`: both copies of
the contact form, requests for a specific lot, requests for an auctioneer, and
the auction planner. They differ only in the context they carry, so there is one
validation path, one payload shape and one delivery step downstream.

`POST /api/contact` does two things with a lead:

1. **Delivers it** to `LEAD_WEBHOOK_URL` as flat JSON — one key per column,
   every key always present even when empty, so a spreadsheet destination gets a
   stable column set. That endpoint is the **CW — Website Lead Intake** workflow
   in n8n, and the request carries the shared secret from
   `LEAD_WEBHOOK_SECRET` in an `x-grivo-secret` header.

   **Both variables are required.** With either missing the lead is logged and
   not sent, rather than posted unauthenticated — anyone who learned the URL
   could otherwise file leads, and a lead starts an SMS follow-up to whatever
   number it carries. The log line records `delivery: 'not-configured'` so the
   cause is visible.

   Two details are the live workflow's contract rather than ours, and should
   not be changed on this side alone: the event date is sent as **`eventDate`**
   (the form field is still `date`; it is renamed on the way out), and
   **`leadId`** is `web:<surface>:<uuid>` — `web:contact:`, `web:item:`,
   `web:quiz:` and so on. n8n dedupes on `leadId`, so a resubmitted enquiry is
   discarded instead of being filed and texted twice.
2. **Logs it** with `console.info`, whatever the webhook did. This is the
   fallback record: if the webhook is unset, unreachable, times out or returns
   an error, the lead is still recoverable from the Vercel function logs.

A delivery failure never surfaces to the submitter. From their side the enquiry
succeeded — their details were captured — and an error would only produce
duplicate submissions.

**The browser sends an id; the server derives the label.** A request link
carries only `?interest=guitar-taylor-swift`, and the endpoint resolves the
display name from the catalog itself, ignoring any label posted from the client.
That text ends up in a notification a human acts on, so a hand-edited URL must
not be able to put chosen wording in front of the client. See
`src/lib/lead-context.ts` for the full trust model and
`src/lib/interests.ts` for the registry.

### Auction planner

`/auction-planner` asks five questions and recommends three categories. It is
ungated on purpose — no email, results shown immediately — and it scores in the
browser from the table in `src/content/collections/planner-rules.ts`, so seeing
the answer costs nothing and needs no round trip. The contact CTA on the results
screen is an offer, not a toll.

All the judgement is in that rules file as data. Changing what the planner
recommends is a change to the weights, not to logic; `src/lib/planner.ts` only
adds them up and sorts. Ties break on a fixed order, broadest appeal first, so
answering "not sure" throughout still returns something sensible.

Planner leads reach `/api/contact` on the same path as everything else, carrying
their answers in the six `quiz*` fields. The endpoint resolves the recommended
category ids to names, so the notification reads "Auction planner quiz —
recommended: Hand-Signed Guitars, Bucket List Trips, Affordable Vacations".

Answers travel from the results screen to the form in the query string, and are
rendered as hidden inputs only — never as text. Printing one back would be a way
to put chosen wording on the page via a crafted link.

### Booking

The contact form's success state embeds Calendly's inline widget, so a lead can
book a call immediately instead of waiting for the follow-up. It is additive —
the lead is delivered and logged before the widget renders, and if Calendly is
blocked or slow the thank-you message and a plain booking link remain.

The scheduling URL lives in `site.booking` in `src/content/site.ts`. Blank it
and the success state reverts to the thank-you message alone.

Calendly's script loads only after a successful submission, so visitors who
never submit get no third-party code and no Calendly cookies. Note that their
copy-paste embed snippet will *not* work here: `widget.js` scans for its
container as it loads, and ours does not exist until after submit. See
`src/components/BookingPanel.tsx`.

The lead's `leadId` travels to Calendly as `utm_content` and its source as
`utm_campaign`. Calendly carries UTM parameters onto the booking record and its
own webhooks, which is what lets a booking be joined to the lead that produced
it rather than matched on email address.

## Where to review the deployed site

**Use <https://charityworks-pearl.vercel.app> until the domain cuts over.**

That is the project's production domain on Vercel. It is exempt from Vercel's
deployment protection, so it opens in any browser with no Vercel login, and it
re-points itself to the newest production deployment automatically.

`https://charityworks-review.vercel.app` serves the same build but sits behind
Vercel SSO, so it only opens for someone logged into the `grivoais-projects`
team. It is a manually assigned alias, which means it does **not** follow new
production deployments — it has to be re-pointed by hand:

```bash
vercel alias set <new-deployment-url> charityworks-review.vercel.app
```

Prefer the pearl URL. The review alias is a convenience for logged-in team
members and will go away at cutover.

### ⚠️ The framework preset must stay "Next.js"

The Vercel project setting **Framework Preset** must be `Next.js`. If it is
`Other` (API: `"framework": null`), the deployment still reports a successful
build and a green **Ready** status — `npm run build` runs and `next build`
genuinely succeeds — but Vercel then discards the `.next/` output and serves
`public/` as a plain static directory.

The symptom is deceptive: every route returns a **plain-text `404` with
`X-Vercel-Error: NOT_FOUND`**, there are **no runtime logs** (nothing is ever
invoked), and yet files that physically exist under `public/` still return 200.
So `/images/catalog/guitars/guitar_01_taylor-swift.jpg` works while `/` and
`/auctioneers` 404, which reads like a routing or DNS fault rather than a build
configuration one.

This is a live trap for this project specifically: it began as a static HTML
site, so the Vercel project was created with no framework preset, and that
setting survived the rebuild into Next.js. If the project is ever recreated,
set the preset explicitly.

Quick check:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://charityworks-pearl.vercel.app/auctioneers
```

`200` is healthy. `404` means check the framework preset before anything else.

## 🚨 Launch checklist

**The site is currently set to `noindex`. This must be turned off when the
domain cuts over, or the site will never appear in search results.**

`.env.production` sets `SITE_NOINDEX=true`. Change that one line to `false`
(or set `SITE_NOINDEX=false` in the Vercel project settings) and redeploy.
`NEXT_PUBLIC_` and build-time variables are inlined at build, so this needs a
**rebuild**, not just a restart.

### Why it is on

`charityworks.net` does not yet point at Vercel — it still resolves to the
client's legacy site behind Cloudflare. Canonical tags are pinned to that
domain, so indexing the site while it is served from a `*.vercel.app` URL would
have every page declaring a canonical on a domain that does not contain it.
That is worse than not being indexed: it actively teaches search engines the
wrong thing. The flag exists to hold indexing until DNS and canonicals agree.

### What the flag does

| | `SITE_NOINDEX=true` (now) | `false` (at launch) |
| --- | --- | --- |
| `<meta name="robots">` | `noindex, nofollow, nocache` | `index, follow` |
| `X-Robots-Tag` header | `noindex, nofollow, noarchive` | absent |
| `Sitemap:` in robots.txt | withheld | present |
| Crawling in robots.txt | **allowed** | allowed |

Three layers because a `<meta>` tag only exists in HTML — the header is what
covers `sitemap.xml` and the optimized images.

**Crawling stays allowed on purpose, in both states.** The instinctive
pre-launch config is `Disallow: /`, but that is counter-productive: a crawler
blocked by robots.txt never fetches the page, so it never reads the `noindex`,
and a URL discovered from an external link can still be indexed as a bare
result. Google's guidance is not to block a page you want de-indexed. Do not
"tighten" robots.txt here.

The flag defaults to `false` when unset, so a missing variable can never
silently de-index a live site — it has to be switched on deliberately.

### Cutover order

1. Point `charityworks.net` DNS at Vercel and add the domain to the project.
2. Confirm the domain serves this app (`/auctioneers` should return 200, not 404).
   A 404 here is far more likely to be the framework preset than DNS — see
   "The framework preset must stay Next.js" above.
3. Set `SITE_NOINDEX=false` and redeploy.
4. Verify `curl -s https://www.charityworks.net/ | grep 'name="robots"'` shows
   `index, follow`, and that `/robots.txt` lists the sitemap.
5. Submit the sitemap in Google Search Console.

## Where the content lives

**No copy is hardcoded in a component.** Everything renders from
`src/content/`, which is deliberately shaped like a database.

```
src/content/types.ts          Interfaces — the future DB schema
src/content/site.ts           Brand, nav, contact details, footer
src/content/collections/      Reusable records shared across pages
  auction-items.ts              catalog categories
  auctioneers.ts                auctioneer roster
  faqs.ts                       FAQ entries
  testimonials.ts               client quotes
  value-props.ts                why-us, pricing, event formats
  steps.ts                      3-step process + donor perks
src/content/pages/            One module per route
src/lib/content.ts            getPage() — the single access point
```

Three rules keep this migratable:

1. Copy lives in `src/content/`, never in JSX.
2. Every repeated record has a stable `id` that is never derived from an array
   index. Those become primary keys.
3. Images are `{ src, alt }` objects rather than bare URL strings, so an upload
   record can replace one in place.

### Phase 2: the admin panel

Routes never import page modules directly — they call `getPage(slug)` from
`src/lib/content.ts`. To move content into a database, change the bodies of the
functions in that one file. Nothing above it changes.

Groundwork already in place:

- **Editable text/images** — every string and image is already a field on a
  typed record in `src/content/`.
- **Form builder** — the contact form renders from `FormField[]`
  (`src/content/pages/contact.ts`). The renderer in
  `src/components/ContactForm.tsx` is driven entirely by that array, so
  admin-authored fields will render without touching the component. It appears
  on both `/` and `/contact` from that single definition; the `idPrefix` prop
  namespaces field ids so the two copies cannot collide.
- **Form submissions** — `POST /api/contact` already exists and validates
  against those same field definitions. It currently logs the submission;
  swap that for a DB write plus a notification.
- **PDF uploads with shareable links** — not started. The `ImageRef` shape is
  the model to follow for an asset record.

Because `AnimatedLayout` wraps `{children}` without reading them, adding it did
not opt any route into client rendering — all seven still prerender statically.
Keep that property in mind when adding wrappers to the root layout.

## Page transitions

Internal navigations play a directional swipe: the current content slides left
and fades, then the new page's top-level sections swipe in from the right,
staggered so the page assembles piece by piece.

```
0ms ── exit (slide -70px, opacity -> 0.9, 200ms) ── router.push()
                                                    §1 ──────── 260ms
                                                      §2 (+60ms) ────────
                                                        §3 (+120ms) ────────
                                                          §4 (+180ms) ────────
                                                            §5+ (+240ms) ────────
                                                                  settles ~720-750ms
```

Implemented in `src/components/AnimatedLayout.tsx` (Framer Motion for the exit
and orchestration) plus the `swipeIn` keyframes in `globals.css` (the
per-section entrance).

Only `<main>`'s contents animate. The nav and footer are siblings of `<main>`,
so they stay fixed. That split is also load-bearing: a CSS transform on an
ancestor re-anchors `position: fixed` descendants to that ancestor rather than
the viewport, which would break the fixed nav and the mobile drawer.

Five things worth knowing before changing any of this:

- **Clicks are intercepted in the capture phase on `window`.** This is not
  incidental. `next/link` attaches its own React `onClick`, and React's
  delegated listener runs before a bubble-phase listener on `document` — so
  Link calls `router.push` first, the route changes in ~45ms, and the exit
  animation never runs. A `window` capture listener fires ahead of React's, and
  `preventDefault()` is enough because `next/link` checks `defaultPrevented`.
  No `stopPropagation`, which would kill unrelated click handlers.
- **Exit via click interception, not `AnimatePresence`.** The App Router
  replaces the routed subtree before `AnimatePresence` can animate the outgoing
  tree; the usual workaround is a "FrozenRouter" built on Next.js private
  internals. Intercepting the click uses public APIs only and gives exact
  control over when navigation fires, which is what keeps the sequence in
  budget.
- **The first render skips the animation** (`initial={false}`, and the
  `page-swipe` class is withheld). A hard page load should not animate, and more
  importantly this keeps `opacity: 0` out of the server-rendered HTML. Without
  it every page ships invisible to anything that does not run the animation —
  non-rendering crawlers, OG/social scrapers, and any client where JS fails.
- **The stagger effect keys off `animatedPath`, never a boolean flag.** This is
  not stylistic. A "first render" boolean in the layout effect's dependencies
  flips on the first *re-render*, and the first re-render is the navigation
  click itself — which fired the effect while still on the outgoing page and
  replayed its entrance animation as a visible flash. The ref stores the last
  animated pathname so only a genuine route change can trigger it.
- **`scroll-behavior: smooth` must stay off `html`.** This is the one that
  actually reached the user, and it is not in the animation code at all. The
  property came from the original single-page build, where nav items were
  anchors and gliding to a section was the point. Those anchors are now routes,
  and Next's scroll-to-top on navigation inherits the property — so every route
  change became a ~1s animated scroll running straight through the transition.
  Clicking the fixed nav from scrollY 4200 produced an ~800px clamp jump (the
  flash) followed by 57 distinct scroll positions still travelling at 1000ms.
  The staggered entrance played correctly the whole time; the viewport was
  racing up through it, so it was never seen. Route changes must reset scroll
  instantly.
- **The exit must travel far enough to read as leaving.** It moves `-32%` of
  the wrapper's width. An earlier version used `-70px` with `opacity: 0.9`,
  chosen to stop a white flash — but on a 1000px viewport that moved under 4%
  of the screen, so the outgoing page barely twitched and then **98.4% of the
  pixels changed in a single frame** at the route swap. A full-screen
  instantaneous replacement reads as a flash no matter how correctly the
  entrance animates afterward, which is exactly why the numeric tests all
  passed while the transition still looked broken.
- **The backdrop is split across two phases, and neither outlives its purpose.**
  Phase 1 (`main.is-transitioning`) covers the strip the wrapper uncovers as it
  slides off; it sits on `<main>` because the wrapper is the thing moving, and
  it is removed the instant the new route commits. Phase 2 (`swipeBackdrop` on
  the wrapper) covers the ~24ms mount gap and clears itself within 200ms, while
  sections are still arriving. An earlier version held one backdrop until every
  section settled, which flipped the area behind transparent sections from navy
  to `--paper` about 1.2s in — a second flash, landing after the page already
  looked finished.
- **An intercepted click must always navigate.** `preventDefault()` blocks the
  browser's own navigation, so if the push is then lost the click is simply
  dead. A click landing exactly on the route-swap boundary could leave
  `isExiting` false, meaning the exit never ran and `onAnimationComplete` never
  fired. A fallback timer guarantees the push, and `pendingHref` is not cleared
  on pathname change for the same reason.
- **The stagger is indexed in JS, not CSS `nth-child`.** Page components return
  fragments, so sections are direct children of the wrapper — but some pages
  also emit JSON-LD `<script>` tags there. `nth-child` would count those and
  give the first visible section a phantom delay. `AnimatedLayout` walks the
  children, skips non-rendered ones, and sets `--swipe-delay` per section.
  Delays are capped at index 4 so a long page cannot blow the budget.
- **`RevealObserver` defers to the swipe.** After a client-side navigation any
  `.reveal` element already in the viewport is shown instantly rather than
  running its own 800ms reveal on top of the section swipe; the two together
  would take ~1.2s. Below-the-fold elements keep the normal scroll reveal.

Timing constants live in `AnimatedLayout.tsx` (exit duration, stagger step);
per-section travel and duration are `--swipe-distance` / `--swipe-duration` in
`globals.css`.

### Testing this

Two variables hid real bugs from otherwise-passing tests. Any future check on
the transition needs both:

1. **Click from a scrolled position, not just the top.** The nav is fixed, so
   real users click it from anywhere on the page. Every early test clicked from
   scrollY 0 — the one position where the smooth-scroll bug is invisible.
2. **Test the dev server as well as the production build.** They differ:
   `reactStrictMode` double-invokes effects, and routes compile on demand.

3. **Measure frame-to-frame pixel change, not just computed styles or a colour
   at one point.** Both weaker methods passed a transition that was visibly
   broken. `getComputedStyle` reported a textbook-correct animation. Sampling
   colour at a point could not help either, because the backdrop is the same
   navy as the incoming hero — "backdrop painted instantly" and "hero slid in"
   sample identically. Only asking *how much of the screen changed between
   consecutive frames* exposed the 98.4% single-frame swap.
4. **Capture with CDP screencast, not `page.screenshot()` in a loop.** Each
   screenshot costs 90–190ms, which against a ~500ms sequence yields three
   samples — far too coarse to tell a smooth animation from a snap. Screencast
   captures at the compositor's real frame rate (~76 frames over 2s).

`scratchpad/pt/cast.mjs` is the reference implementation of the last two.

`prefers-reduced-motion: reduce` disables the whole thing — including the exit
delay, so those users get instant navigation rather than a slower one.

Cost: one ~26 KB gzipped chunk for Framer Motion. Only the exit tween and the
push chaining actually use it; the rest is CSS.

### Auctioneer roster

Transcribed from the live charityworks.net/auctioneers page. That page is
JS-rendered, so `WebFetch` and the legacy scrape in `reference/` both return
only the word "Auctioneers" — it has to be read with a real browser.

**Photo filenames are not trustworthy.** Ten of the eleven files in
`public/images/catalog/auctioneers/` are captioned with the wrong person,
because the scraper labelled each image with whatever text sat nearest it —
three separate files are named `tony-shaw` and only one of them is Tony Shaw.
The mapping in `collections/auctioneers.ts` was established by matching local
files to the live page's images by exact pixel dimensions in document order,
confirming each name heading sits within ~6px of its image, then checking every
photograph against its bio. Do not "fix" those paths to match the filenames.

Client copy is reproduced as written, with these corrections:

| Original | Corrected |
| --- | --- |
| "Nothern California & Central California" | "Northern California…" |
| "an first year introductory rate" | "First-year introductory rate" |
| "his on-air work KTVU" | "his on-air work at KTVU" |
| "Charity Benefit Host and/or auctioneer , Sal" | "charity benefit host and auctioneer, Sal" |
| "Brittany's background is as a trained dancer with … gives her" | "Brittany's background as a trained dancer with … gives her" |

"female Benefit Auctioneer Specialist" is kept verbatim — female BAS is a
marketed specialty in this industry, so removing it would strip positioning
rather than fix an error.

Sal Castaneda and Brittany Trammell carry no territory badge because the client
publishes no territory for them. West Coast Events / Gina Longmire is rendered
in a separate partner section, not the roster: they are an event planning and
catering company, and listing a caterer among "elite charity auctioneers" reads
as a roster error.

## Typography

**Never apply negative `letter-spacing` to Playfair Display.** Chrome disables
OpenType ligatures whenever `letter-spacing` is non-zero. Playfair's `f` has a
large ball terminal that collides with a following `i` or `l`, and the
`fi`/`fl`/`ff`/`ffl` ligatures exist specifically to resolve that collision.
The headings originally carried `letter-spacing: -0.01em`, which suppressed
those ligatures and produced the exact glyph collision they prevent — visible
as a jammed "fi" in words like "Nonprofits" and "offline".

Measured, on `profits offline` in Playfair 900 at 64px:

| Variant | Width | Ligature restored |
| --- | --- | --- |
| `letter-spacing: -0.01em` (was shipped) | 405.83px | no |
| `letter-spacing: 0` | 413.31px | **yes** |
| tracking + `font-variant-ligatures: common-ligatures` | 405.83px | no (0.00px change) |
| tracking + `font-feature-settings: "liga" 1, "clig" 1` | 405.64px | no (0.19px change) |

Ligatures cannot be forced back on while tracking is applied, so removing the
tracking is the only fix. Headings became ~1.8% wider; verified for re-wrap and
overflow at 1440/1024/390px.

**Positive `letter-spacing` is fine** and is still used on eyebrows, badges and
uppercase labels. It spreads glyphs apart rather than colliding them, and
suppressing ligatures in letterspaced text is correct typographic practice.

`scratchpad/pt/ligdiff.mjs` audits the whole site by rasterising each word with
and without ligatures and diffing pixels. Width comparison is **not** a valid
detector here — Playfair's `fi` has nearly the same advance as `f` + `i`, so a
real ligature measures as zero width change.

## Notes

- `reference/` holds the client's old MyWebsiteBuilder site (scraped) and
  `original-demo.html`, the single-page demo this site was ported from. Kept for
  content reference and excluded from deploys via `.vercelignore` so it cannot
  be crawled or compete in search results.
- `app/globals.css` is the demo's stylesheet ported verbatim — same tokens, same
  class names — so the approved design is preserved. New rules for the
  multi-page structure are appended below a marked divider.
- The home page testimonial marquee renders the list twice on purpose: the CSS
  animation translates the track by exactly `-50%`, and the second copy is what
  makes the loop seamless. The duplicate half is `aria-hidden`, and
  `/testimonials` renders a static grid so each quote is indexed once.
