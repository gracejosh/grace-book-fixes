/*
# Grace Book — Enhanced Schema (Flyers, Posts, Blogs, Book Pricing, Ads)

## Overview
Adds new tables for Flyers, Posts, Blogs with comments, popup Ads management,
and extends the books table with pricing columns (free/paid, Apple Books URL, EPUB URL).
Also adds banned flag to profiles for admin moderation.

## New Tables
1. `flyers` — Community flyers with images, likes, categories
2. `posts` — User posts (text, image, PDF, audio) with likes and shares
3. `blogs` — Blog articles with images/videos, likes, shares
4. `blog_comments` — Comments on blog posts
5. `popup_ads` — Admin-controlled popup advertisements shown every 30 min

## Modified Tables
- `books`: Added `price_type` (free/paid), `apple_books_url`, `epub_url`
- `profiles`: Added `is_banned` flag for admin moderation

## Security
- RLS enabled on ALL new tables.
- Content tables (flyers, posts, blogs, blog_comments): public read, authenticated insert own, update/delete own.
- `popup_ads`: public read, admin-only insert/update/delete.
- All owner columns default to `auth.uid()`.
*/

-- ============ BOOKS: ADD PRICING COLUMNS ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'price_type') THEN
    ALTER TABLE books ADD COLUMN price_type text NOT NULL DEFAULT 'free';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'apple_books_url') THEN
    ALTER TABLE books ADD COLUMN apple_books_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'epub_url') THEN
    ALTER TABLE books ADD COLUMN epub_url text;
  END IF;
END $$;

-- ============ PROFILES: ADD BANNED FLAG ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============ FLYERS ============
CREATE TABLE IF NOT EXISTS flyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  images text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'General',
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE flyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flyers_public_read" ON flyers;
CREATE POLICY "flyers_public_read" ON flyers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "flyers_owner_insert" ON flyers;
CREATE POLICY "flyers_owner_insert" ON flyers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "flyers_owner_update" ON flyers;
CREATE POLICY "flyers_owner_update" ON flyers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "flyers_owner_delete" ON flyers;
CREATE POLICY "flyers_owner_delete" ON flyers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ POSTS ============
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text',
  content text NOT NULL,
  file_url text,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_public_read" ON posts;
CREATE POLICY "posts_public_read" ON posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "posts_owner_insert" ON posts;
CREATE POLICY "posts_owner_insert" ON posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_owner_update" ON posts;
CREATE POLICY "posts_owner_update" ON posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_owner_delete" ON posts;
CREATE POLICY "posts_owner_delete" ON posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ BLOGS ============
CREATE TABLE IF NOT EXISTS blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  video_url text,
  category text NOT NULL DEFAULT 'General',
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blogs_public_read" ON blogs;
CREATE POLICY "blogs_public_read" ON blogs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "blogs_owner_insert" ON blogs;
CREATE POLICY "blogs_owner_insert" ON blogs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blogs_owner_update" ON blogs;
CREATE POLICY "blogs_owner_update" ON blogs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blogs_owner_delete" ON blogs;
CREATE POLICY "blogs_owner_delete" ON blogs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ BLOG COMMENTS ============
CREATE TABLE IF NOT EXISTS blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_comments_public_read" ON blog_comments;
CREATE POLICY "blog_comments_public_read" ON blog_comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "blog_comments_owner_insert" ON blog_comments;
CREATE POLICY "blog_comments_owner_insert" ON blog_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "blog_comments_owner_delete" ON blog_comments;
CREATE POLICY "blog_comments_owner_delete" ON blog_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ POPUP ADS ============
CREATE TABLE IF NOT EXISTS popup_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  image_url text,
  link_url text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE popup_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "popup_ads_public_read" ON popup_ads;
CREATE POLICY "popup_ads_public_read" ON popup_ads FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "popup_ads_admin_insert" ON popup_ads;
CREATE POLICY "popup_ads_admin_insert" ON popup_ads FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "popup_ads_admin_update" ON popup_ads;
CREATE POLICY "popup_ads_admin_update" ON popup_ads FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "popup_ads_admin_delete" ON popup_ads;
CREATE POLICY "popup_ads_admin_delete" ON popup_ads FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_flyers_category ON flyers(category);
CREATE INDEX IF NOT EXISTS idx_flyers_user_id ON flyers(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blogs_category ON blogs(category);
CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON blog_comments(blog_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_popup_ads_active ON popup_ads(is_active);
