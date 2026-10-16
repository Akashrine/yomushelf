-- Cover storage, as found in production on 2026-10-16 (read-only check),
-- now written down and tightened :
-- * bucket manga-covers is public : anyone may READ a cover by its URL ;
-- * RLS on storage.objects with NO policy for this bucket : no reader
--   (anon or signed in) can upload, replace, delete or list. Only the
--   server (service role, after safe-image.ts checks) writes covers ;
-- * new : 2 MB and JPEG / PNG / WebP only, also enforced by storage itself.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manga-covers', 'manga-covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
