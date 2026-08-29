-- The brochure a lot links to, as a document-link slug.
--
-- The slug rather than the upload id: /d/<slug> is the address the client hands
-- out and the thing that survives the file behind it being replaced.
--
-- No foreign key to document_links. A constraint would turn "the client typed a
-- slug that does not exist yet" into a database error on save, and would block
-- deleting a document until every lot pointing at it was cleared. The category
-- page renders the button only for a slug that resolves instead.
alter table catalog_items
  add column document_slug text;

comment on column catalog_items.document_slug is
  'document_links.slug for this lot''s brochure. Renders the "Print / Download this PDF" button when it resolves.';
