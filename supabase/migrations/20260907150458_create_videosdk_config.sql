/*
# Create videosdk_config table for storing VideoSDK API credentials

1. New Tables
- `videosdk_config`
- `id` (uuid, primary key)
- `api_key` (text, not null) — VideoSDK API key
- `secret` (text, not null) — VideoSDK secret key
- `created_at` (timestamptz, default now)
2. Security
- Enable RLS on `videosdk_config`.
- No policies: this table is only accessible via the service role key (edge functions).
  The anon and authenticated roles have no access, so the secrets are never exposed to the frontend.
*/

CREATE TABLE IF NOT EXISTS videosdk_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL,
  secret text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE videosdk_config ENABLE ROW LEVEL SECURITY;

INSERT INTO videosdk_config (api_key, secret)
VALUES (
  '552a12a6-b1d6-4f08-8e11-35e230feb9cb',
  'f33a14df787965f1968c1beb9ab108a583ddca1aede08b77316f22357babc2d7'
)
ON CONFLICT DO NOTHING;
