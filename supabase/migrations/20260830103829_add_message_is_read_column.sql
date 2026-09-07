ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
