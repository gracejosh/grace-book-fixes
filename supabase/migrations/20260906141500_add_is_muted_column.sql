/*
# Add is_muted column to profiles

## Changes
- Added `is_muted` boolean column to `profiles` table (defaults to false).
- Used by the admin mute/unmute feature in the Admin page.

## Security
- No RLS policy changes needed; existing profiles_update policy already covers the column.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_muted') THEN
    ALTER TABLE profiles ADD COLUMN is_muted boolean NOT NULL DEFAULT false;
  END IF;
END $$;
