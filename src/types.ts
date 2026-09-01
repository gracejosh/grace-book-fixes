export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface BibleVerse {
  id: string;
  verse_text: string;
  reference: string;
  category: string;
  verse_date: string | null;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cloudinary_url: string;
  cover_url: string | null;
  category: string;
  file_format: string;
  downloads_count: number;
  price_type: 'free' | 'paid';
  apple_books_url: string | null;
  epub_url: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  youtube_video_id: string;
  thumbnail_url: string | null;
  duration: string | null;
  instructor: string | null;
  category: string;
  created_at: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  category: string;
  difficulty: string;
  created_at: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  category: string | null;
  time_taken: number | null;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  created_by: string | null;
  participants: string[];
  is_active: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string | null;
  content: string;
  attachment_url: string | null;
  reply_to: string | null;
  created_at: string;
}

export interface CourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  progress_percentage: number;
  is_completed: boolean;
  updated_at: string;
}

export interface BookDownload {
  id: string;
  user_id: string;
  book_id: string;
  downloaded_at: string;
}

export interface FavoriteVerse {
  id: string;
  user_id: string;
  verse_id: string;
  created_at: string;
}

export interface AdminSettings {
  id: string;
  admin_password: string;
  site_name: string;
  youtube_channel_id: string;
}

export interface PrayerRequest {
  id: string;
  name: string;
  email: string;
  request: string;
  is_private: boolean;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
}

export interface Flyer {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  images: string[];
  category: string;
  likes_count: number;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  type: 'text' | 'image' | 'pdf' | 'audio';
  content: string;
  file_url: string | null;
  likes_count: number;
  created_at: string;
}

export interface Blog {
  id: string;
  user_id: string;
  title: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  category: string;
  likes_count: number;
  created_at: string;
}

export interface BlogComment {
  id: string;
  blog_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface PopupAd {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
}
