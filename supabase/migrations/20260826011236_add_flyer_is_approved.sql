/*
# Add is_approved column to flyers table

1. Modified Tables
- `flyers`
  - Add `is_approved` (boolean, default true) — allows admins to approve/hide flyers.
    Defaults to true so all existing flyers remain visible; admins can set it to false to hide one.

2. Security
- No RLS policy changes — existing policies remain in effect.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'flyers' AND column_name = 'is_approved'
  ) THEN
    ALTER TABLE flyers ADD COLUMN is_approved boolean NOT NULL DEFAULT true;
  END IF;
END $$;
