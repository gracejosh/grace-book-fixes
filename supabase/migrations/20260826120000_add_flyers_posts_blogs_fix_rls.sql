-- 1. POSTS TABLE (referenced by Posts.tsx but not yet created) ----------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'text',
  title TEXT,
  content TEXT,
  media_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  likes_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

-- 2. BLOGS TABLE --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT,
  content TEXT,
  image_url TEXT,
  category TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FLYERS TABLE -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flyers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT,
  description TEXT,
  images TEXT[],
  category TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.flyer_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flyer_id UUID NOT NULL REFERENCES public.flyers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (flyer_id, user_id)
);

-- 4. DISABLE RLS on specified tables -----------------------------------------
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flyers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flyer_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_downloads DISABLE ROW LEVEL SECURITY;

-- 5. GRANTS -------------------------------------------------------------------
GRANT ALL ON public.books, public.courses, public.chat_rooms, public.messages,
  public.posts, public.post_likes, public.post_downloads, public.blogs,
  public.flyers, public.flyer_likes TO anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Indexes
CREATE INDEX IF NOT EXISTS flyers_created_at_idx ON public.flyers (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts (created_at DESC);
