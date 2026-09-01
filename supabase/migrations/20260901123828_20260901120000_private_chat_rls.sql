/*
# Private chat rooms RLS and profiles ban column

1. Changes to `chat_rooms`
   - Updated SELECT policy: public rooms visible to everyone; private rooms only visible to participants.
   - Updated INSERT policy: any authenticated user can create rooms (public or private).
   - Updated UPDATE policy: creator OR participant can update (to join by adding themselves to participants).
2. Changes to `messages`
   - Updated SELECT policy: messages in public rooms visible to all; messages in private rooms only visible to participants.
3. Changes to `profiles`
   - Added `is_banned` boolean column if it does not already exist (used by admin ban/unban feature).
4. Security
   - Private chat rooms and their messages are now restricted to the two participants.
   - Public rooms remain open to all authenticated users.
*/

-- Add is_banned column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Update chat_rooms SELECT policy: private rooms only visible to participants
DROP POLICY IF EXISTS "chat_rooms_public_read" ON chat_rooms;
CREATE POLICY "chat_rooms_public_read" ON chat_rooms FOR SELECT
  TO anon, authenticated USING (
    type = 'public'
    OR (auth.uid() IS NOT NULL AND participants @> ARRAY[auth.uid()])
  );

-- Update chat_rooms INSERT policy: any authenticated user can create rooms
DROP POLICY IF EXISTS "chat_rooms_auth_insert" ON chat_rooms;
CREATE POLICY "chat_rooms_auth_insert" ON chat_rooms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Update chat_rooms UPDATE policy: creator or participant can update (e.g., join room)
DROP POLICY IF EXISTS "chat_rooms_owner_update" ON chat_rooms;
CREATE POLICY "chat_rooms_owner_update" ON chat_rooms FOR UPDATE
  TO authenticated USING (
    auth.uid() = created_by
    OR participants @> ARRAY[auth.uid()]
  )
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update messages SELECT policy: public room messages visible to all; private only to participants
DROP POLICY IF EXISTS "messages_public_read" ON messages;
CREATE POLICY "messages_public_read" ON messages FOR SELECT
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

-- Messages INSERT: only participants of the room can send messages
DROP POLICY IF EXISTS "messages_auth_insert" ON messages;
CREATE POLICY "messages_auth_insert" ON messages FOR INSERT
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

-- Messages UPDATE: only sender can edit their own messages
DROP POLICY IF EXISTS "messages_owner_update" ON messages;
CREATE POLICY "messages_owner_update" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

-- Messages DELETE: only sender can delete their own messages
DROP POLICY IF EXISTS "messages_owner_delete" ON messages;
CREATE POLICY "messages_owner_delete" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- Profiles: allow users to update their own profile
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
