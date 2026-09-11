/*
# Create profiles table

1. New Tables
- `profiles`
  - `id` (uuid, primary key — matches auth.users.id)
  - `email` (text, not null)
  - `username` (text, not null)
  - `full_name` (text)
  - `facebook_url` (text, nullable — optional Facebook profile link)
  - `telegram_url` (text, nullable — optional Telegram link)
  - `whatsapp_number` (text, nullable — optional WhatsApp number)
  - `tiktok_url` (text, nullable — optional TikTok link)
  - `phone_number` (text, nullable — optional phone number)
  - `website_url` (text, nullable — optional personal website)
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)

2. Security
- Enable RLS on `profiles`.
- Owner-scoped CRUD: each authenticated user can only read, insert, update, and delete their own profile row.
- SELECT, INSERT, UPDATE, DELETE policies all check auth.uid() = id.

3. Trigger
- `handle_new_user` function: when a new user signs up (email or OAuth), automatically inserts a profile row with their id, email, username (from metadata or email prefix), and full_name (from metadata).
- Trigger fires AFTER INSERT on auth.users.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text NOT NULL,
  full_name text,
  facebook_url text,
  telegram_url text,
  whatsapp_number text,
  tiktok_url text,
  phone_number text,
  website_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- Auto-create profile row when a new auth user signs up (email or OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
