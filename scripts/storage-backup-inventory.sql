-- Run through an authorized SQL connection; save the inventory JSON locally.
-- This inventories object metadata only, not credentials or application rows.
-- The backup command reads public objects. It fails if any bucket is private.
select jsonb_build_object(
  'schemaVersion', 1,
  'capturedAt', now(),
  'buckets', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'public', public) order by id), '[]'::jsonb) from storage.buckets),
  'objectCount', (select count(*) from storage.objects),
  'objects', (select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'bucket', bucket_id, 'name', name,
    'bytes', (metadata->>'size')::bigint,
    'mimeType', metadata->>'mimetype',
    'etag', metadata->>'eTag', 'updatedAt', updated_at
  ) order by bucket_id, name), '[]'::jsonb) from storage.objects)
) as inventory;
