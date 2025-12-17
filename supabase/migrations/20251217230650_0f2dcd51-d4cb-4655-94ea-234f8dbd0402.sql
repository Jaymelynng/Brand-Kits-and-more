DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public uploads to campaign-assets'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public uploads to campaign-assets" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = ''campaign-assets'')';
  END IF;
END $$;