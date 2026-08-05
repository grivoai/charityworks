# Phase 2 — Admin Panel

Approved 2026-08-04. This is the reference for the whole phase; if the build
and this document disagree, one of them is a bug.

Phase 1 shipped a site whose content lives in hand-authored TypeScript modules,
rendered fully static. Phase 2 puts that content behind a login-protected admin
panel so the client edits it without a developer, and adds submissions storage,
file uploads and a form builder.

---

## Contents

1. [What Phase 1 already gave us](#what-phase-1-already-gave-us)
2. [Four collisions](#four-collisions)
3. [The database decision](#the-database-decision)
4. [Rendering](#rendering)
5. [Data model](#data-model)
6. [Type safety across the seam](#type-safety-across-the-seam)
7. [Auth](#auth)
8. [Migration](#migration)
9. [Build phases](#build-phases)
10. [Decisions log](#decisions-log)

---

## What Phase 1 already gave us

`src/lib/content.ts` was built as the seam and says so in its own doc comment:
*"In Phase 2 the bodies of these functions become database queries and nothing
above them changes."* That held up. Every route calls `getPage()` /
`getAuctionCategory()` rather than importing content modules directly — 24 call
sites across 14 files.

`src/content/types.ts` was written as a schema in waiting: a stable `id` on
every repeated record, `ImageRef` as an object "so a Phase 2 upload record can
slot in", `FormField` "shaped to become a Phase 2 form-builder record".

Two gaps closed during 2.0:

- **`@/content/site` was imported directly in 11 places**, bypassing the seam.
  Now behind `getSite()`.
- **The accessors were synchronous.** Database queries make them async, so the
  call sites gained an `await`.

---

## Four collisions

Four things look like ordinary editable content but are load-bearing. All
of them are enforced in the schema, not just in the UI — a constraint that lives
only in a form is a constraint that a future refactor removes by accident.

### 1. Contact form fields feed a live pipeline

`/api/contact` validates against `getPage("contact").form.fields` and maps
`date` → `eventDate` for the "CW — Website Lead Intake" workflow in n8n, which
writes fixed spreadsheet columns and triggers an SMS follow-up. Renaming or
deleting a core field silently stops leads mapping — and a broken lead pipeline
looks exactly like a quiet week.

**Resolution.** Two classes of field. Core fields (`name`, `org`, `email`,
`phone`, `date`, `message`) carry `locked = true`: label, placeholder,
required-ness and order stay editable, the submitted key and the field's
existence do not. Admin-added fields are delivered under a single
`customFields` object so the spreadsheet's column set never shifts.

### 2. A category's `blurb` renders on three surfaces

The bento tile, the category page's hero lede, and the auction planner's "why
this fits you" card all read the same field. There is no separate quiz-card
text: the copy audit deleted `plannerCategoryNotes` and pointed the card at the
client's own verbatim line instead.

**Resolution.** It stays one field, and the admin says so explicitly next to the
input. Splitting it is the exact affordance that reintroduces the invented
positioning the audit removed.

### 3. Catalog item ids are load-bearing for lead attribution

`catalog_items.id` is what `?interest=<id>` carries and what `resolveInterest()`
looks up. Ids are immutable after creation, and "remove" archives
(`published = false`) rather than deleting — a hard delete turns any circulating
link into an untyped "general enquiry".

### 4. Two pages embedded a copy of the catalog

Found while writing the seed. `HomePage.itemsTeaser.items` was
`auctionItems.slice(0, 4)` and `AuctionItemsPage.items` was `auctionItems` —
derived views, harmless when the catalog was a compiled-in constant. Stored as
part of a page record they become a frozen snapshot, so a category added in the
admin would appear on its own page and be silently missing from the home page
and the catalog index.

**Resolution.** Both fields are gone from the page schemas. The routes read the
catalog through `getAuctionCategories()` and the home page takes the first
`HOME_TEASER_COUNT`. Nothing about the rendered output changed.

---

## The database decision

The requirements are not only "store content": #1 is auth and #4 is file
storage. That is what decides it.

| | **Supabase** (chosen) | Neon + Vercel Blob + Auth.js | Turso / SQLite |
|---|---|---|---|
| Postgres + JSONB | yes | yes | partial (no JSONB) |
| Auth (req 1) | built in | hand-wired Auth.js | hand-wired |
| File storage (req 4) | built in, CDN | Vercel Blob | separate vendor |
| Vendors | 1 | 2–3 | 2–3 |
| Cost at this volume | free tier | free tier | free tier |

**Chosen: Supabase.** Auth and storage are two of the five requirements and it
covers both over a real Postgres that this schema runs on unmodified. The
alternative is three products wired together for the same result.

Accepted tradeoffs:

- **A second vendor alongside Vercel.** All-Vercel (Neon + Blob + Auth.js) was
  the considered alternative; roughly a day more wiring, mostly password reset.
- **Free-tier projects pause when idle**, so the first query after a quiet spell
  is slow. Harmless here: the public site never queries at request time.
- **Supabase Auth is built around client-side JWTs and RLS**, which this does
  not need. All writes go through server actions behind one `requireAdmin()`
  guard using the service role. RLS is enabled with deny-all policies as a
  backstop so a leaked anon key reads nothing, but there is no per-table RLS
  matrix — that would be ceremony for a two-person admin.

### The option rejected

A git-backed CMS (TinaCMS, Decap) writing to the existing TypeScript files would
preserve version control and suits a small content site. Rejected because
requirements 3 and 4 need a datastore regardless, and every catalog edit would
trigger a full Vercel rebuild. Once a database exists for submissions, splitting
content across git and a database is worse than one store.

---

## Rendering

The site is fully static today — no `revalidate`, no `force-dynamic`. Moving
content to a database naively would make every page hit Postgres on every visit
and throw that away.

**Static generation is kept, with revalidation on write.** Pages stay
prerendered; an admin save calls `revalidateTag()` and the affected routes
regenerate within seconds. Visitors never touch the database. This is also what
makes free-tier idle-pausing a non-issue.

| Entity | Tag | Invalidates |
|---|---|---|
| Page | `page:<slug>` | that route |
| Site globals | `site` | every route (nav, footer) |
| Category | `category:<slug>` + `catalog` | detail page, index, home teaser, planner |
| Form | `form:<id>` | contact page and the API route's validation read |
| Document | `doc:<slug>` | the `/d/<slug>` route |

### Fallback behaviour, and why it is asymmetric

When the Supabase environment variables are **absent**, the content layer reads
the seed modules and logs that it is doing so. That is what lets the site build
and run before the database exists, and it doubles as disaster recovery.

When the variables are **present but a query fails**, the build throws. It does
not fall back. Silently serving seed content over the client's own edits would
be worse than a failed deploy, because nobody would notice.

### Next's build cache does not know the content changed

Found while verifying 2.0. A round trip proved the point: a category title was
changed in Postgres and nowhere else, then `npm run build` was run. The
rendered HTML still carried the old title — 17 occurrences of it, none of the
new one. Deleting `.next` and rebuilding produced the new title on all five
pages that render it.

So a rebuild reuses prerendered HTML when no *source file* has changed, and a
database-only edit is invisible to that check. Vercel restores `.next/cache`
between deployments, so a deploy triggered by a code push could in principle
ship pages built from older content.

This does not affect the normal editing path — a save calls `revalidateTag()`,
which regenerates the affected routes directly and does not consult the build
cache. It matters for the deploy path, and it is the reason the content reads
need to be wrapped in tagged cache entries rather than left as bare async
functions. Tracked as part of the revalidation work.

Until that lands, a deploy made shortly after a content edit should be
spot-checked, or forced with a cache-skipping redeploy.

---

## Data model

The schema lives in [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql),
which is the source of truth — it is what actually runs. Rather than keep a
second copy here that drifts, this section records what the tables are for and
why they are shaped that way.

| Table | Holds | Why this shape |
| --- | --- | --- |
| `admin_users` | Role and profile per login | Supabase owns `auth.users`; this adds role without duplicating credentials |
| `pages` | One `jsonb` document per page slug | Pages are edited whole and rendered whole. Normalizing `HomePage.hero.stats` and `AuctioneersPage.differentiators.items` into tables would mean ~20 tables and an unusable admin |
| `site_settings` | Single row: nav, contact, footer, booking | One record, edited as one form |
| `content_revisions` | Full snapshot per save | The replacement for git history, since the client edits live copy. Enables one-click restore |
| `catalog_categories` / `catalog_groups` / `catalog_items` | The catalog, normalized | Independent lifecycles: adding a lot without a developer is requirement 5. Needs listing, reordering and concurrent edits that do not clobber a shared blob |
| `uploads` | Media library, images and PDFs | Provenance and dedupe by checksum |
| `document_links` | `/d/<slug>` → an upload | A stable public link that survives replacing the file, so next quarter's newsletter reuses the same URL |
| `forms` / `form_fields` | The form builder's definitions | `locked` is the column that protects the n8n contract — see collision 1 |
| `submissions` | Every lead, plus delivery state | `raw` + `webhook_status` make a failed delivery replayable |
| `audit_log` | Who changed what | Useful the first time two people disagree about an edit |

Three decisions inside that file are worth stating plainly, because they are not
the obvious choice:

**Images are stored as `image_src` / `image_alt` columns, not as a required
foreign key to `uploads`.** `ImageRef` is what the site renders, a `src` can be
either a Phase 1 asset under `/images` or a Supabase storage URL, and requiring
a join would have meant inventing 96 upload rows at seed time for files nobody
uploaded. `image_upload_id` is an optional nullable reference kept purely for
provenance, so "where is this file used?" stays answerable and deleting an
upload can warn.

**`submissions.raw` stores the exact payload that was posted.** This is what
makes replay possible, and it closes a real gap: today a lead survives a webhook
outage only in Vercel's function logs, recoverable by hand.

**RLS is enabled on every table with no policies at all.** That denies the anon
and authenticated roles entirely. Reads and writes go through the service role
from server-side code, gated by `requireAdmin()`. The policies are a backstop
against a leaked anon key, not the mechanism — a per-table policy matrix would
be ceremony for an admin with two users, and ceremony that looks like security
is worse than none.

`submissions.raw` plus `webhook_status` buys something the current site does not
have: **replay**. Today a lead survives a webhook outage only in Vercel function
logs, recoverable by hand. With these columns a failed delivery is visible in
the admin and retryable with a button.

---

## Type safety across the seam

TypeScript guarantees a `HomePage` is shaped correctly today. `jsonb` is
`unknown` at runtime, so that guarantee has to be replaced rather than lost.

**Zod schemas mirroring `types.ts`, doing three jobs:**

1. Validate on write, so malformed data cannot be saved.
2. Parse on read, failing loudly instead of rendering `undefined`.
3. **Generate the admin form fields** — one schema per shape, rather than a
   hand-built form per page.

The inferred types are exported under the existing names, so the 13 type-only
importers are untouched.

The doc comments in `types.ts` carry real rules — `ItemDetail`'s "no prices,
every value must come from the client", for one. Those move into `.describe()`
and surface as help text in the admin, so the person filling in item details
reads the rule at the moment it applies.

---

## Auth

- Supabase Auth, email and password, **no public signup** — users are invited
  from the Supabase dashboard.
- Next.js middleware gates `/admin/*`.
- `requireAdmin()` is re-checked inside every server action. Middleware alone is
  not authorization; it is a redirect.
- Login is rate limited.
- `/admin` is excluded from the sitemap and sent `noindex` regardless of the
  `SITE_NOINDEX` flag.

---

## Migration

`scripts/seed.ts` imports the existing content modules and inserts them, so the
database starts byte-identical to what is live. `lib/content.ts` then reads
queries instead.

Parity is verified rather than assumed: every route is rendered before and after
against the same data and the HTML diffed. The probe harnesses from Phase 1
already cover most routes.

The TypeScript content modules stay in the repo as seed fixtures and as the
documented fallback described under [Rendering](#rendering). They are not the
runtime source of truth once the database is populated.

---

## Build phases

| Phase | Delivers | Verified by |
|---|---|---|
| **2.0 Foundation** | Supabase project, schema, auth, `/admin` shell, seed, `lib/content.ts` → queries, revalidation | HTML diff: every route renders identically, still static |
| **2.1 Content editing** | Page and site copy forms, revision history, restore | Edit a field, live in seconds, no rebuild |
| **2.2 Catalog CRUD** | Add/edit/reorder categories, groups, items, item details (req 2, 5) | Add a lot, it appears with a working request link |
| **2.3 Uploads** | Image and PDF upload, `/d/<slug>` links (req 4) | Upload, share, replace the file, link still resolves |
| **2.4 Forms + submissions** | Field editor with locked core fields, submissions table, replay (req 3) | Submit, row appears in admin **and** n8n still receives it unchanged |

2.0 first because it is the only phase that can break the live site; everything
after is additive. 2.2 before 2.4 because 77 lots are waiting on
`docs/item-details-needed.md`, which is the bottleneck for real content.

Throughout, the n8n lead pipeline keeps working exactly as it does today.
Storing submissions is additive, on the same discipline as the Calendly work.

---

## Decisions log

| Decision | Choice | Alternative considered |
|---|---|---|
| Database | Supabase | Neon + Vercel Blob + Auth.js; git-backed CMS |
| Publishing | Immediate, with revision history and one-click restore | Draft → preview → publish |
| PDF links | Public and permanent at `/d/<slug>` | Private, expiring signed URLs |
| Rendering | Static + on-demand revalidation | Dynamic rendering per request |
| Core form fields | Locked (key and existence immutable) | Fully free-form builder |
| Category `blurb` | One field across all three surfaces | Separate quiz-card field |
| Removing catalog items | Archive (`published = false`) | Hard delete |

---

## Open

- **The old site's newsletter/trips page.** The reference copies in `reference/`
  contain no PDF or download pattern, only the word "Trips". A URL or screenshot
  would let 2.3 match the existing behaviour; without one it ships the general
  upload → permanent link design above.
