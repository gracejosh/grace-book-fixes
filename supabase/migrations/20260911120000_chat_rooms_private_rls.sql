/*
# Private chat rooms visible to participants only

1. Security Changes
- Replaces the existing SELECT policy on chat_rooms so that:
  - Public rooms remain visible to all authenticated users.
  - Private rooms are only visible to users whose ID appears in the
    participants array.
- This prevents users from seeing other users' private conversations.

2. Important Notes
- The policy uses auth.uid() = ANY(participants) to check membership.
- Public rooms (type = 'public') remain open to everyone.
- The old SELECT policy is dropped first to avoid duplicates.
*/

-- Ensure RLS is enabled
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Drop old select policy if it exists
DROP POLICY IF EXISTS "Private rooms visible to participants only" ON chat_rooms;

-- Create the new select policy
CREATE POLICY "Private rooms visible to participants only"
ON chat_rooms FOR SELECT
TO authenticated
USING (
  type = 'public'
  OR auth.uid() = ANY(participants)
);
