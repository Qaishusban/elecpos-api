// src/lib/supabase-server.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Next's cookies are readonly on server during the request;
          // leave set/remove no-ops to satisfy API shape.
        },
        remove(name: string, options: any) {
          // same note as above
        },
      },
    }
  );
}
