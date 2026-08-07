-- Constraints on the documents bucket, for phase 2.3.
--
-- The two buckets were created by hand in the Supabase dashboard when 2.0 went
-- in, which means their settings existed only as clicks nobody wrote down. This
-- records them, and adds the two that the document links actually depend on.
--
-- Why the bucket and not just the application: the browser uploads STRAIGHT to
-- storage using a signed URL, because Vercel caps a function's request body at
-- 4.5 MB and a brochure is bigger than that. So these are the only checks that
-- run before bytes are stored. Everything in src/lib/admin/uploads.ts runs
-- after the fact and can only refuse and delete.
--
-- Keep the size in step with MAX_DOCUMENT_BYTES in src/lib/admin/uploads.ts.
-- `npm run check:documents` fails if they drift apart.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

update storage.buckets
   set public = true,
       file_size_limit = 26214400,                 -- 25 MB
       allowed_mime_types = array['application/pdf']
 where id = 'documents';

-- Public on purpose, and decided in docs/phase-2-plan.md: these links go in a
-- newsletter and are forwarded for years, so an expiring signed URL would be a
-- link that stops working at a time nobody chose. Nothing private goes in this
-- bucket; the `images` bucket is unchanged either way.
--
-- The narrow mime type is what stops a public bucket on a supabase.co domain
-- becoming somewhere an .html file can be parked and linked to.
