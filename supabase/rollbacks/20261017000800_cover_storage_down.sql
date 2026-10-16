-- Rollback of 20261017000800_cover_storage.sql : back to the production
-- settings found before (no size or type limit). The bucket and its covers stay.
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'manga-covers';
