-- Constraints on the images bucket, for the photograph upload.
--
-- Same reasoning as 0002: the browser uploads straight to storage using a
-- signed URL, so these are the only checks that run BEFORE the bytes are
-- stored. Everything in src/lib/admin/uploads.ts runs after the fact and can
-- only refuse and delete.
--
-- Keep the size in step with MAX_IMAGE_BYTES in src/lib/admin/image-rules.ts.
-- `npm run check:uploads` fails if they drift apart.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

update storage.buckets
   set public = true,
       file_size_limit = 10485760,                  -- 10 MB
       allowed_mime_types = array[
         'image/jpeg',
         'image/png',
         'image/webp'
       ]
 where id = 'images';

-- No SVG, deliberately. An SVG is a document that can carry script, this bucket
-- is public and served from a supabase.co origin, and next/image cannot
-- optimize one anyway — so it would be the single upload type that is both
-- riskier and worse than what it replaces.
--
-- 10 MB rather than the documents bucket's 25: these are catalog photographs on
-- a page that loads a dozen at once, and next/image resizes on the way out, so
-- a 30 MB original costs the client storage and their visitors nothing.
