/*
# Chat Feature Enhancements — Read Receipts, Typing Indicators, Message Limits
Adds message_reads table for read receipts, is_voice and voice_duration columns on messages.
*/
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_voice boolean NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_duration integer;
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reader_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS message_reads_message_reader_uniq ON message_reads(message_id, reader_id);
CREATE INDEX IF NOT EXISTS message_reads_message_idx ON message_reads(message_id);
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_reads_select_auth" ON message_reads;
CREATE POLICY "message_reads_select_auth" ON message_reads FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "message_reads_insert_own" ON message_reads;
CREATE POLICY "message_reads_insert_own" ON message_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = reader_id);
DROP POLICY IF EXISTS "message_reads_delete_own" ON message_reads;
CREATE POLICY "message_reads_delete_own" ON message_reads FOR DELETE TO authenticated USING (auth.uid() = reader_id);
