import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  facebook_url: string | null;
  telegram_url: string | null;
  whatsapp_number: string | null;
  tiktok_url: string | null;
  phone_number: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};
