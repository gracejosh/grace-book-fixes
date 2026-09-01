/*
# Add tags column to blogs table

1. Modified Tables
- `blogs`
  - Add `tags` (text[], default NULL) — allows tagging blog posts for better organization and search.
    Stored as a PostgreSQL text array; the frontend will edit it as a comma-separated string.

2. Security
- No RLS policy changes — existing policies remain in effect.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blogs' AND column_name = 'tags'
  ) THEN
    ALTER TABLE blogs ADD COLUMN tags text[] DEFAULT NULL;
  END IF;
END $$;
