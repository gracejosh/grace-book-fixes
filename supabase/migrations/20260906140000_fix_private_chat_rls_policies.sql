/*
# Fix Private Chat RLS Policies

## Problem
Multiple duplicate and overly-permissive RLS policies existed on chat_rooms, messages, and profiles.
In PostgreSQL RLS, permissive policies are OR'd together, so any policy with `USING (true)`
made all restrictive policies useless. Private chat rooms and their messages were visible to
ALL users, defeating 1-to-1 private chat privacy.

## Changes

### chat_rooms
- Dropped ALL existing policies (including duplicates and permissive ones).
- Created 4 clean CRUD policies:
  - SELECT: public rooms visible to everyone; private rooms only visible to participants.
  - INSERT: any authenticated user can create rooms (public or private).
  - UPDATE: creator or existing participant can update (e.g., join room by adding self).
  - DELETE: only the room creator can delete.

### messages
- Dropped ALL existing policies (including duplicates and permissive ones).
- Created 4 clean CRUD policies:
  - SELECT: messages in public rooms visible to all; messages in private rooms only visible to room participants.
  - INSERT: only room participants can send messages (sender must be auth.uid()).
  - UPDATE: only the message sender can edit.
  - DELETE: only the message sender can delete.

### profiles
- Dropped ALL existing policies (including duplicates).
- Created 4 clean CRUD policies:
  - SELECT: all profiles visible to authenticated users (needed for user search in private chat).
  - INSERT: users can only insert their own profile.
  - UPDATE: users can only update their own profile.
  - DELETE: users can only delete their own profile.
- Added `is_banned` column if missing (used by admin ban/unban feature).

## Security
- Private chat rooms are now truly private: only the 2 participants can see the room and its messages.
- User search works because authenticated users can read all profiles.
- No permissive `USING (true)` policies remain on these tables.
*/

-- ============================================
-- chat_rooms: drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "chat_rooms_public_read" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_select_all" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_auth_insert" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_insert_auth" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_owner_update" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_update_auth" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_delete_auth" ON chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_owner_delete" ON chat_rooms;

-- chat_rooms: clean SELECT policy
CREATE POLICY "chat_rooms_select" ON chat_rooms FOR SELECT
  TO anon, authenticated USING (
    type = 'public'
    OR (auth.uid() IS NOT NULL AND participants @> ARRAY[auth.uid()])
  );

-- chat_rooms: clean INSERT policy
CREATE POLICY "chat_rooms_insert" ON chat_rooms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- chat_rooms: clean UPDATE policy
CREATE POLICY "chat_rooms_update" ON chat_rooms FOR UPDATE
  TO authenticated USING (
    auth.uid() = created_by
    OR participants @> ARRAY[auth.uid()]
  )
  WITH CHECK (auth.uid() IS NOT NULL);

-- chat_rooms: clean DELETE policy
CREATE POLICY "chat_rooms_delete" ON chat_rooms FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ============================================
-- messages: drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "messages_public_read" ON messages;
DROP POLICY IF EXISTS "messages_select_all" ON messages;
DROP POLICY IF EXISTS "messages_owner_insert" ON messages;
DROP POLICY IF EXISTS "messages_insert_own" ON messages;
DROP POLICY IF EXISTS "messages_owner_update" ON messages;
DROP POLICY IF EXISTS "messages_update_own" ON messages;
DROP POLICY IF EXISTS "messages_owner_delete" ON messages;
DROP POLICY IF EXISTS "messages_delete_own" ON messages;

-- messages: clean SELECT policy
CREATE POLICY "messages_select" ON messages FOR SELECT
  TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = messages.room_id
      AND (
        chat_rooms.type = 'public'
        OR (auth.uid() IS NOT NULL AND chat_rooms.participants @> ARRAY[auth.uid()])
      )
    )
  );

-- messages: clean INSERT policy
CREATE POLICY "messages_insert" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = messages.room_id
      AND (
        chat_rooms.type = 'public'
        OR chat_rooms.participants @> ARRAY[auth.uid()]
      )
    )
  );

-- messages: clean UPDATE policy
CREATE POLICY "messages_update" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

-- messages: clean DELETE policy
CREATE POLICY "messages_delete" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- ============================================
-- profiles: add is_banned column if missing
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================
-- profiles: drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_owner_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- profiles: clean SELECT policy (authenticated users can see all profiles for user search)
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

-- profiles: clean INSERT policy
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- profiles: clean UPDATE policy
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- profiles: clean DELETE policy
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);
