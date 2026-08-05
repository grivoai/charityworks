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
2. [Three collisions](#three-collisions)
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

## Three collisions

Three things look like ordinary editable content but are load-bearing. All
three are enforced in the schema, not just in the UI — a constraint that lives
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

---

## Data model

```sql
-- ============================== auth ==============================
-- Supabase owns auth.users (password hashing, sessions, reset email).
create table admin_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  name         text,
  role         text not null default 'editor' check (role in ('owner','editor')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

-- ============================ content =============================
-- Pages are documents: edited whole, rendered whole, heterogeneous shapes.
-- Normalizing HomePage.hero.stats and AuctioneersPage.differentiators.items
-- into relational tables would mean ~20 tables and an unusable admin.
create table pages (
  slug       text primary key,          -- matches PageSlug
  data       jsonb not null,            -- validated against the page's Zod schema
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id)
);

create table site_settings (
  id         int primary key default 1 check (id = 1),   -- single row
  data       jsonb not null,            -- SiteContent: nav, contact, booking, footer
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id)
);

-- The client edits live copy with no git safety net. This is the replacement.
create table content_revisions (
  id         bigserial primary key,
  entity     text not null,             -- 'page' | 'site' | 'category' | 'item'
  entity_id  text not null,
  data       jsonb not null,            -- full snapshot, for one-click restore
  created_at timestamptz not null default now(),
  created_by uuid references admin_users(id)
);
create index on content_revisions (entity, entity_id, created_at desc);

-- ============================ catalog =============================
-- Real tables, not JSONB: these have independent lifecycles (requirement 5 is
-- "add items without a developer") and need listing, reordering and concurrent
-- edits that do not clobber a shared blob.
create table catalog_categories (
  id           text primary key,        -- immutable; the lead pipeline references it
  slug         text not null unique,
  icon         text not null,
  title        text not null,
  blurb        text not null,           -- renders on 3 surfaces, see collision 2
  heading      text not null,
  intro        text not null,
  image_id     uuid references uploads(id),
  image_alt    text not null,
  span         text check (span in ('wide','tall')),
  general_only boolean not null default false,
  seo          jsonb not null,          -- SeoMeta
  position     int not null,
  published    boolean not null default true,
  updated_at   timestamptz not null default now()
);

create table catalog_groups (
  id          text primary key,
  category_id text not null references catalog_categories(id) on delete cascade,
  title       text,
  blurb       text,
  position    int not null
);

create table catalog_items (
  id          text primary key,         -- immutable; this is ?interest=<id>
  group_id    text not null references catalog_groups(id) on delete cascade,
  name        text not null,
  description text not null,
  image_id    uuid references uploads(id),
  image_alt   text,
  note        text,
  details     jsonb not null default '[]',   -- ItemDetail[]; descriptive only, no pricing
  position    int not null,
  published   boolean not null default true, -- archive, never hard delete
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on catalog_items (group_id, position);

-- ============================ uploads =============================
create table uploads (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null check (bucket in ('images','documents')),
  path        text not null,
  filename    text not null,            -- original name as uploaded
  mime_type   text not null,
  bytes       bigint not null,
  width       int, height int,          -- images only
  alt         text,                     -- required for images on save
  checksum    text,                     -- sha256, dedupe on re-upload
  uploaded_by uuid references admin_users(id),
  created_at  timestamptz not null default now(),
  unique (bucket, path)
);

-- A stable public link that survives replacing the file, so next quarter's
-- newsletter reuses the same URL instead of minting a new one.
create table document_links (
  slug       text primary key,          -- served at /d/<slug>
  upload_id  uuid not null references uploads(id),
  title      text not null,
  updated_at timestamptz not null default now()
);

-- ============================= forms ==============================
create table forms (
  id              text primary key,     -- 'contact'
  name            text not null,
  submit_label    text not null,
  success_message text not null,
  error_message   text not null,
  updated_at      timestamptz not null default now()
);

create table form_fields (
  id          text primary key,
  form_id     text not null references forms(id) on delete cascade,
  name        text not null,            -- submitted key
  label       text not null,
  type        text not null check (type in
                ('text','email','tel','date','textarea','select','checkbox')),
  placeholder text,
  help        text,
  required    boolean not null default false,
  width       text not null default 'full' check (width in ('half','full')),
  options     jsonb,                    -- select choices
  position    int not null,
  locked      boolean not null default false,  -- protects the n8n contract
  unique (form_id, name)
);

-- =========================== submissions ==========================
create table submissions (
  id               uuid primary key default gen_random_uuid(),
  lead_id          text not null unique,   -- same web:<surface>:<uuid> sent to n8n
  form_id          text references forms(id),
  submitted_at     timestamptz not null default now(),
  -- core fields as columns so the admin table can sort and filter
  name text, org text, email text, phone text, event_date text, message text,
  -- lead context, mirroring the existing payload
  source           text not null,
  source_path      text,
  interest_type    text, interest_id text,
  interest_label   text, interest_category text,
  quiz             jsonb,
  context_summary  text,
  custom           jsonb not null default '{}',  -- admin-added fields
  -- delivery, so a webhook outage is recoverable
  webhook_status   text not null default 'pending'
                     check (webhook_status in ('pending','sent','failed','not-configured')),
  webhook_attempts int not null default 0,
  webhook_last_error text,
  raw              jsonb not null       -- exact payload, enables replay
);
create index on submissions (submitted_at desc);
create index on submissions (source, submitted_at desc);

-- ============================ audit ===============================
create table audit_log (
  id         bigserial primary key,
  actor_id   uuid references admin_users(id),
  action     text not null,             -- 'page.update' | 'item.create' | ...
  entity     text not null, entity_id text,
  diff       jsonb,
  created_at timestamptz not null default now()
);
```

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
