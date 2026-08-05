-- CharityWorks admin panel — initial schema.
--
-- Run once against a fresh Supabase project, before `npm run seed`.
-- See docs/phase-2-plan.md for the reasoning behind each table.
--
-- On authorization: every table has RLS enabled with NO policies, which denies
-- all access to the anon and authenticated roles. That is deliberate. Reads and
-- writes go through the service role from server-side code only, gated by
-- requireAdmin(). These policies are a backstop so a leaked anon key reads
-- nothing — not the mechanism.

/* ============================== auth ============================== */

create table admin_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  name         text,
  role         text not null default 'editor' check (role in ('owner','editor')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

/* ============================= uploads ============================ */
-- Created first: catalog rows carry an optional provenance reference to it.

create table uploads (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null check (bucket in ('images','documents')),
  path        text not null,
  filename    text not null,
  mime_type   text not null,
  bytes       bigint not null,
  width       int,
  height      int,
  alt         text,
  checksum    text,
  uploaded_by uuid references admin_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (bucket, path)
);

create index uploads_bucket_created_idx on uploads (bucket, created_at desc);
create index uploads_checksum_idx on uploads (checksum);

-- A stable public link that survives replacing the file, so next quarter's
-- newsletter reuses the same URL instead of minting a new one.
create table document_links (
  slug       text primary key,
  upload_id  uuid not null references uploads(id) on delete restrict,
  title      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ============================= content ============================ */

-- Pages are documents: edited whole, rendered whole, heterogeneous shapes.
-- Normalizing HomePage.hero.stats and AuctioneersPage.differentiators.items
-- into relational tables would mean ~20 tables and an unusable admin.
create table pages (
  slug       text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);

create table site_settings (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);

-- The client edits live copy with no git safety net. This is the replacement.
create table content_revisions (
  id         bigserial primary key,
  entity     text not null check (entity in ('page','site','category','item')),
  entity_id  text not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references admin_users(id) on delete set null,
  note       text
);

create index content_revisions_entity_idx
  on content_revisions (entity, entity_id, created_at desc);

/* ============================= catalog ============================ */
-- Real tables rather than jsonb: these have independent lifecycles (adding a
-- lot without a developer is requirement 5) and need listing, reordering and
-- concurrent edits that do not clobber a shared blob.
--
-- Images are stored as src/alt directly rather than only as a foreign key to
-- uploads. ImageRef is the contract the site renders, a src can be either a
-- Phase 1 asset under /images or a storage URL, and requiring a join would mean
-- inventing 96 upload rows at seed time for files that were never uploaded.
-- image_upload_id is optional provenance, so "where is this file used?" stays
-- answerable and deleting an upload can warn.

create table catalog_categories (
  id              text primary key,
  slug            text not null unique,
  icon            text not null,
  title           text not null,
  -- Renders in three places: the bento tile, this category's hero lede, and the
  -- auction planner's results card. There is no separate quiz-card field, by
  -- design — see docs/phase-2-plan.md, collision 2.
  blurb           text not null,
  heading         text not null,
  intro           text not null,
  image_src       text not null,
  image_alt       text not null,
  image_width     int,
  image_height    int,
  image_upload_id uuid references uploads(id) on delete set null,
  span            text check (span in ('wide','tall')),
  general_only    boolean not null default false,
  seo             jsonb not null,
  position        int not null,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index catalog_categories_position_idx on catalog_categories (position);

create table catalog_groups (
  id          text primary key,
  category_id text not null references catalog_categories(id) on delete cascade,
  title       text,
  blurb       text,
  position    int not null
);

create index catalog_groups_category_idx on catalog_groups (category_id, position);

create table catalog_items (
  id              text primary key,
  group_id        text not null references catalog_groups(id) on delete cascade,
  name            text not null,
  description     text not null,
  image_src       text,
  image_alt       text,
  image_width     int,
  image_height    int,
  image_upload_id uuid references uploads(id) on delete set null,
  note            text,
  -- ItemDetail[]. Descriptive facts only: no prices, retail values or
  -- estimates. The site quotes no figure for any individual lot.
  details         jsonb not null default '[]'::jsonb,
  position        int not null,
  -- Archive, never hard delete. This id is what ?interest= carries and what
  -- resolveInterest() looks up; deleting the row turns any circulating link
  -- into an untyped "general enquiry".
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index catalog_items_group_idx on catalog_items (group_id, position);

/* ============================== forms ============================= */

create table forms (
  id              text primary key,
  name            text not null,
  submit_label    text not null,
  success_message text not null,
  error_message   text not null,
  updated_at      timestamptz not null default now()
);

create table form_fields (
  id          text primary key,
  form_id     text not null references forms(id) on delete cascade,
  name        text not null,
  label       text not null,
  type        text not null check (type in
                ('text','email','tel','date','textarea','select','checkbox')),
  placeholder text,
  help        text,
  required    boolean not null default false,
  width       text not null default 'full' check (width in ('half','full')),
  options     jsonb,
  position    int not null,
  -- The n8n "CW — Website Lead Intake" workflow reads these keys and writes
  -- fixed spreadsheet columns. A locked field's name and existence are not
  -- editable; its label, placeholder, required flag and order are.
  locked      boolean not null default false,
  unique (form_id, name)
);

create index form_fields_form_idx on form_fields (form_id, position);

/* =========================== submissions ========================== */

create table submissions (
  id                 uuid primary key default gen_random_uuid(),
  -- The same web:<surface>:<uuid> value sent to n8n, which dedupes on it.
  lead_id            text not null unique,
  form_id            text references forms(id) on delete set null,
  submitted_at       timestamptz not null default now(),

  -- Core fields as columns so the admin table can sort and filter on them.
  name               text,
  org                text,
  email              text,
  phone              text,
  event_date         text,
  message            text,

  -- Lead context, mirroring the payload the endpoint already builds.
  source             text not null,
  source_path        text,
  interest_type      text,
  interest_id        text,
  interest_label     text,
  interest_category  text,
  quiz               jsonb,
  context_summary    text,
  custom             jsonb not null default '{}'::jsonb,

  -- Delivery state, so a webhook outage is recoverable rather than being
  -- survivable only in Vercel's function logs.
  webhook_status     text not null default 'pending'
                       check (webhook_status in
                         ('pending','sent','failed','not-configured')),
  webhook_attempts   int not null default 0,
  webhook_last_error text,
  webhook_sent_at    timestamptz,
  -- The exact payload posted, which is what makes replay possible.
  raw                jsonb not null
);

create index submissions_submitted_idx on submissions (submitted_at desc);
create index submissions_source_idx on submissions (source, submitted_at desc);
create index submissions_status_idx on submissions (webhook_status)
  where webhook_status in ('pending','failed');

/* ============================== audit ============================= */

create table audit_log (
  id         bigserial primary key,
  actor_id   uuid references admin_users(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  diff       jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on audit_log (created_at desc);

/* =============================== RLS ============================== */
-- Enabled with no policies: denies anon and authenticated entirely. The service
-- role bypasses RLS by design and is the only thing that reads or writes these
-- tables. See the note at the top of this file.

alter table admin_users       enable row level security;
alter table uploads           enable row level security;
alter table document_links    enable row level security;
alter table pages             enable row level security;
alter table site_settings     enable row level security;
alter table content_revisions enable row level security;
alter table catalog_categories enable row level security;
alter table catalog_groups    enable row level security;
alter table catalog_items     enable row level security;
alter table forms             enable row level security;
alter table form_fields       enable row level security;
alter table submissions       enable row level security;
alter table audit_log         enable row level security;

/* ========================== updated_at ============================ */

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pages_updated_at before update on pages
  for each row execute function set_updated_at();
create trigger site_settings_updated_at before update on site_settings
  for each row execute function set_updated_at();
create trigger catalog_categories_updated_at before update on catalog_categories
  for each row execute function set_updated_at();
create trigger catalog_items_updated_at before update on catalog_items
  for each row execute function set_updated_at();
create trigger forms_updated_at before update on forms
  for each row execute function set_updated_at();
create trigger document_links_updated_at before update on document_links
  for each row execute function set_updated_at();
