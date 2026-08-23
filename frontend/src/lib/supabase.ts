// ============================================
// Supabase Client for Frontend
// Quản lý Authentication & Session
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ekjqhmosasziofldicwb.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_RqMunF1jqFWYCBRuDq5MyA_p42kxG_-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
