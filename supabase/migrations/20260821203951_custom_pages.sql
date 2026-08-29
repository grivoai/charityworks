/* ==================================================================
   Custom pages — pages the client builds themselves, out of blocks.

   Separate from `pages` rather than an extension of it, and the reason
   is a type rather than a preference: `PageSlug` is a compile-time
   union of the eight built-in slugs, and getPage(), pageSchemas[],
   PAGE_LABELS, PAGE_PATHS, tagsForPage() and visual-map.ts are all
   keyed on it. User-created content cannot join a compile-time union,
   so widening `pages` would mean unpicking that everywhere. The eight
   built-in pages keep their bespoke schemas and hand-written routes
   untouched; these are a second, block-shaped thing beside them.
   ================================================================== */

create table custom_pages (
  -- The address, without a leading slash: "gala-2026" serves /gala-2026.
  -- Unique because it IS the URL; the application also refuses any slug
  -- that collides with a real route, which the database cannot know about.
  slug       text primary key,
  data       jsonb not null,
  -- Draft pages are not served at all. Kept out of `data` so the list
  -- query can filter on it without unpacking every document.
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id) on delete set null
);

create index custom_pages_published_idx on custom_pages (published, updated_at desc);

alter table custom_pages enable row level security;

/* Same posture as every other content table: deny-all to the
   `authenticated` role, because reads and writes go through the service
   client behind requireAdmin() rather than through RLS. */
create policy custom_pages_no_access on custom_pages
  for all to authenticated using (false) with check (false);

create trigger custom_pages_updated_at before update on custom_pages
  for each row execute function set_updated_at();

/* The revisions table already versions 'page', 'site', 'category' and
   'item'. Custom pages get the same history and the same restore. */
alter table content_revisions drop constraint content_revisions_entity_check;
alter table content_revisions add constraint content_revisions_entity_check
  check (entity in ('page','site','category','item','custom-page'));
