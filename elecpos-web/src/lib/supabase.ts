import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;

function assert(v: any, name: string) {
  if (!v) throw new Error(`Missing env ${name}. Add it in .env.local and restart dev server.`);
}

/** للمتصفح (كلاينت) */
export const supabaseBrowser = () => {
  assert(URL, "NEXT_PUBLIC_SUPABASE_URL");
  assert(ANON, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(URL, ANON);
};

/** للسيرفر (بدون service role) */
export const supabaseServer = () => {
  assert(URL, "NEXT_PUBLIC_SUPABASE_URL");
  assert(ANON, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

/** للأعمال الإدارية فقط (سيرفر فقط) */
export const supabaseAdmin = () => {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin is server-only");
  }
  assert(URL, "NEXT_PUBLIC_SUPABASE_URL");
  assert(SERVICE, "SUPABASE_SERVICE_ROLE");
  return createClient(URL, SERVICE as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};
