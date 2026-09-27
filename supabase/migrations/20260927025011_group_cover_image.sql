-- The photograph on a group's tile in the section picker.
--
-- A category with two or more titled groups opens with a tile per group, and
-- until now that tile borrowed the group's first lot's picture. Which lot is
-- first is an ordering decision made for the list of lots, so the tile changed
-- whenever a lot was added, reordered or sold out, and the client had no way to
-- say "this is the photograph that represents Costume Jewelry" at all — the
-- section had no lots, so it showed the category's icon.
--
-- Four columns rather than a jsonb `cover_image`, matching `catalog_categories`
-- and `catalog_items`: the same ImageRef is stored the same way everywhere, and
-- the usage scan that decides whether an upload can be deleted reads these
-- columns by name.
--
-- No `cover_image_upload_id`. The existing `image_upload_id` columns are
-- provenance nothing writes, and a fifth of them would be one more column that
-- looks like it means something. "Where is this photograph used?" is answered
-- by scanning for the URL — see src/lib/admin/image-usage.ts.
--
-- All four nullable, with no backfill. A group with no cover photograph keeps
-- the behaviour it has today, which is a working tile rather than an empty one.
alter table catalog_groups
  add column cover_image_src    text,
  add column cover_image_alt    text,
  add column cover_image_width  int,
  add column cover_image_height int;

comment on column catalog_groups.cover_image_src is
  'Photograph shown on this group''s tile in the category page''s section picker. Null falls back to the group''s first lot''s picture.';
