import { createClient } from '@supabase/supabase-js';

// Server-side Supabase configuration using process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jqndaxqwtmiueazldlpy.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbmRheHF3dG1pdWVhemxkbHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3ODk0MTYsImV4cCI6MjA3MTM2NTQxNn0.cKUF_062jcomm6kKgRfQyESEP7I51KxaSX7A48UQKK0';

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

// Re-export all the types from the main supabase file
export type * from './supabase';