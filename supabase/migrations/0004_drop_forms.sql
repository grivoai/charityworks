-- Drops the forms tables, which were seeded and never read.
--
-- 0001 created `forms` and `form_fields` for a form builder that would hold the
-- contact form's definition. It never did: the contact PAGE document is what the
-- site renders the form from, what `app/api/contact/route.ts` validates against,
-- and what the admin edits — so these two tables sat with one row and six rows
-- that nothing consulted.
--
-- The one thing they had that the page document does not was `form_fields.locked`,
-- the column meant to protect the six keys the n8n workflow reads. `locks.ts` now
-- does that in code, with a reason the client can read in the admin, and refuses
-- a save that would drop one. Two places that can disagree about which fields are
-- protected is worse than one, and the code half is the one that actually runs.
--
-- Applied by hand on 2026-08-08 and recorded here so a rebuilt project matches.

drop table if exists form_fields;
drop table if exists forms;

-- `submissions.form_id` is deliberately left in place. Its foreign key goes with
-- the table above, leaving a plain text label — which is all it was ever used as.
-- Every enquiry today is filed under 'contact'; keeping the column means a second
-- form can be told apart later without a migration, and costs a text field.
