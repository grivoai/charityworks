-- Affordable-tier flag on a lot, for the star shown beside its name.
--
-- A boolean rather than a price, deliberately. The site quotes no figure for
-- any individual lot, so the star says which tier a lot is in and the opening
-- bid stays a conversation.
--
-- NOT NULL DEFAULT FALSE rather than nullable: every lot has an answer to "is
-- this in the lower tier", and the answer for a lot nobody has marked is no.
alter table catalog_items
  add column affordable_tier boolean not null default false;

comment on column catalog_items.affordable_tier is
  'Shows a gold star beside the lot name, under the legend on the category page.';
