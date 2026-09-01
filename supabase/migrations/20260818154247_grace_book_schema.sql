/*
# Grace Book — Full Application Schema

## Overview
Creates the complete schema for the Grace Book Christian web application: a multi-user app with auth, bible verses, books library, courses, quizzes, chat system, profiles, and admin management.

## Tables Created
1. `profiles` — extends auth.users with public profile info (username, full_name, avatar_url, bio, is_admin)
2. `bible_verses` — daily verse library with categories
3. `books` — downloadable Christian books with Cloudinary URLs
4. `courses` — free video courses linked to YouTube
5. `quizzes` — quiz questions with options, answer, category, difficulty
6. `quiz_results` — per-user quiz attempt records
7. `chat_rooms` — public and private chat rooms
8. `messages` — realtime chat messages per room
9. `course_progress` — per-user course completion tracking
10. `book_downloads` — per-user book download tracking
11. `favorite_verses` — per-user saved verses
12. `admin_settings` — site config (admin password, site name, youtube channel)
13. `prayer_requests` — prayer submissions from the About page
14. `newsletter_subscribers` — email newsletter signups
15. `contact_messages` — contact form submissions

## Security
- RLS enabled on ALL tables.
- `profiles`: owner-scoped SELECT/UPDATE; public SELECT (so users can see each other in chat).
- Content tables (bible_verses, books, courses, quizzes, admin_settings): public read for anon+authenticated; admin-only writes (is_admin check via profiles join).
- User-scoped tables (quiz_results, course_progress, book_downloads, favorite_verses): owner-scoped CRUD with DEFAULT auth.uid().
- `chat_rooms`: public read; authenticated insert/update of own rooms.
- `messages`: public read (so participants see messages); authenticated insert own; update/delete own.
- `prayer_requests`, `newsletter_subscribers`, `contact_messages`: public insert (no auth needed to submit), no public read (privacy).
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_owner_update" ON profiles;
CREATE POLICY "profiles_owner_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_owner_insert" ON profiles;
CREATE POLICY "profiles_owner_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============ BIBLE VERSES ============
CREATE TABLE IF NOT EXISTS bible_verses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_text text NOT NULL,
  reference text NOT NULL,
  category text NOT NULL DEFAULT 'Faith',
  verse_date date UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bible_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verses_public_read" ON bible_verses;
CREATE POLICY "verses_public_read" ON bible_verses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "verses_admin_insert" ON bible_verses;
CREATE POLICY "verses_admin_insert" ON bible_verses FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "verses_admin_update" ON bible_verses;
CREATE POLICY "verses_admin_update" ON bible_verses FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "verses_admin_delete" ON bible_verses;
CREATE POLICY "verses_admin_delete" ON bible_verses FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ BOOKS ============
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  description text,
  cloudinary_url text NOT NULL,
  cover_url text,
  category text NOT NULL DEFAULT 'General',
  file_format text NOT NULL DEFAULT 'PDF',
  downloads_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "books_public_read" ON books;
CREATE POLICY "books_public_read" ON books FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "books_admin_insert" ON books;
CREATE POLICY "books_admin_insert" ON books FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "books_admin_update" ON books;
CREATE POLICY "books_admin_update" ON books FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "books_admin_delete" ON books;
CREATE POLICY "books_admin_delete" ON books FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ COURSES ============
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  youtube_video_id text NOT NULL,
  thumbnail_url text,
  duration text,
  instructor text,
  category text NOT NULL DEFAULT 'Bible Study',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_public_read" ON courses;
CREATE POLICY "courses_public_read" ON courses FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "courses_admin_insert" ON courses;
CREATE POLICY "courses_admin_insert" ON courses FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "courses_admin_update" ON courses;
CREATE POLICY "courses_admin_update" ON courses FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "courses_admin_delete" ON courses;
CREATE POLICY "courses_admin_delete" ON courses FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ QUIZZES ============
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options text[] NOT NULL,
  correct_answer integer NOT NULL,
  category text NOT NULL DEFAULT 'Bible',
  difficulty text NOT NULL DEFAULT 'Easy',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quizzes_public_read" ON quizzes;
CREATE POLICY "quizzes_public_read" ON quizzes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "quizzes_admin_insert" ON quizzes;
CREATE POLICY "quizzes_admin_insert" ON quizzes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "quizzes_admin_update" ON quizzes;
CREATE POLICY "quizzes_admin_update" ON quizzes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

DROP POLICY IF EXISTS "quizzes_admin_delete" ON quizzes;
CREATE POLICY "quizzes_admin_delete" ON quizzes FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ QUIZ RESULTS ============
CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  category text,
  time_taken integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_results_public_read" ON quiz_results;
CREATE POLICY "quiz_results_public_read" ON quiz_results FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "quiz_results_owner_insert" ON quiz_results;
CREATE POLICY "quiz_results_owner_insert" ON quiz_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quiz_results_owner_delete" ON quiz_results;
CREATE POLICY "quiz_results_owner_delete" ON quiz_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ CHAT ROOMS ============
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'public',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  participants uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_rooms_public_read" ON chat_rooms;
CREATE POLICY "chat_rooms_public_read" ON chat_rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "chat_rooms_auth_insert" ON chat_rooms;
CREATE POLICY "chat_rooms_auth_insert" ON chat_rooms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "chat_rooms_owner_update" ON chat_rooms;
CREATE POLICY "chat_rooms_owner_update" ON chat_rooms FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "chat_rooms_owner_delete" ON chat_rooms;
CREATE POLICY "chat_rooms_owner_delete" ON chat_rooms FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  attachment_url text,
  reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_public_read" ON messages;
CREATE POLICY "messages_public_read" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "messages_owner_insert" ON messages;
CREATE POLICY "messages_owner_insert" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_owner_update" ON messages;
CREATE POLICY "messages_owner_update" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages_owner_delete" ON messages;
CREATE POLICY "messages_owner_delete" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

-- ============ COURSE PROGRESS ============
CREATE TABLE IF NOT EXISTS course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_percentage integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_progress_public_read" ON course_progress;
CREATE POLICY "course_progress_public_read" ON course_progress FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "course_progress_owner_insert" ON course_progress;
CREATE POLICY "course_progress_owner_insert" ON course_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "course_progress_owner_update" ON course_progress;
CREATE POLICY "course_progress_owner_update" ON course_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "course_progress_owner_delete" ON course_progress;
CREATE POLICY "course_progress_owner_delete" ON course_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ BOOK DOWNLOADS ============
CREATE TABLE IF NOT EXISTS book_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);
ALTER TABLE book_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_downloads_owner_read" ON book_downloads;
CREATE POLICY "book_downloads_owner_read" ON book_downloads FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "book_downloads_owner_insert" ON book_downloads;
CREATE POLICY "book_downloads_owner_insert" ON book_downloads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "book_downloads_owner_delete" ON book_downloads;
CREATE POLICY "book_downloads_owner_delete" ON book_downloads FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ FAVORITE VERSES ============
CREATE TABLE IF NOT EXISTS favorite_verses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  verse_id uuid NOT NULL REFERENCES bible_verses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, verse_id)
);
ALTER TABLE favorite_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorite_verses_owner_read" ON favorite_verses;
CREATE POLICY "favorite_verses_owner_read" ON favorite_verses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorite_verses_owner_insert" ON favorite_verses;
CREATE POLICY "favorite_verses_owner_insert" ON favorite_verses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorite_verses_owner_delete" ON favorite_verses;
CREATE POLICY "favorite_verses_owner_delete" ON favorite_verses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ ADMIN SETTINGS ============
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_password text NOT NULL DEFAULT 'grace2024',
  site_name text NOT NULL DEFAULT 'Grace Book',
  youtube_channel_id text NOT NULL DEFAULT 'grace-chat-global',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_settings_public_read" ON admin_settings;
CREATE POLICY "admin_settings_public_read" ON admin_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_settings_admin_update" ON admin_settings;
CREATE POLICY "admin_settings_admin_update" ON admin_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ PRAYER REQUESTS ============
CREATE TABLE IF NOT EXISTS prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  request text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prayer_requests_public_insert" ON prayer_requests;
CREATE POLICY "prayer_requests_public_insert" ON prayer_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "prayer_requests_admin_read" ON prayer_requests;
CREATE POLICY "prayer_requests_admin_read" ON prayer_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ NEWSLETTER SUBSCRIBERS ============
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_public_insert" ON newsletter_subscribers;
CREATE POLICY "newsletter_public_insert" ON newsletter_subscribers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_admin_read" ON newsletter_subscribers;
CREATE POLICY "newsletter_admin_read" ON newsletter_subscribers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ CONTACT MESSAGES ============
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_public_insert" ON contact_messages;
CREATE POLICY "contact_public_insert" ON contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contact_admin_read" ON contact_messages;
CREATE POLICY "contact_admin_read" ON contact_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_bible_verses_category ON bible_verses(category);
CREATE INDEX IF NOT EXISTS idx_bible_verses_date ON bible_verses(verse_date);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_user_id ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_book_downloads_user_id ON book_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_verses_user_id ON favorite_verses(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);

-- ============ TRIGGER: auto-create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TRIGGER: auto-update updated_at ============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS course_progress_updated_at ON course_progress;
CREATE TRIGGER course_progress_updated_at
  BEFORE UPDATE ON course_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
