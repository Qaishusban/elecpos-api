import 'server-only';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '../lib/database.types'; // عدّل المسار حسب مشروعك
import { createClient } from "@supabase/supabase-js";
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE!; // service role for secured selects/export
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
export function supabaseServer() {
  // نمرّر مرجع cookies كما هو
  return createServerComponentClient<Database>({ cookies });
}

// alias إن أردت
export const getServerSupabase = supabaseServer;
export const supabaseBrowser  = supabaseServer;

