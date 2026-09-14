/*
# Add group profile fields

Adds the optional profile data used by the chat group information panel.
Existing rooms remain valid and receive the built-in fallback description/avatar.
*/

ALTER TABLE chat_rooms
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS avatar_url text;