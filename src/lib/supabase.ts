import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pqzrmrtisbmpdjathdhb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxenJtcnRpc2JtcGRqYXRoZGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjA2MjgsImV4cCI6MjEwMjYzNjYyOH0.foOACqSB1caxq5oCF_s0dtZSzQYafu4OyEIdlZ1soNM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'grace.book';
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'grace_preset';
export const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY || '8IfOPMrV8w6Mh85iQLMQy_qUryU';

export async function uploadToCloudinary(file: File, resourceType: 'image' | 'raw' | 'video' = 'image'): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('api_key', CLOUDINARY_API_KEY);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  return data.secure_url as string;
}
