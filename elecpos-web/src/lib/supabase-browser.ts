'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '../lib/database.types';

let _sb: ReturnType<typeof createClientComponentClient<Database>> | null = null;

export function supabaseBrowser() {
  if (_sb) return _sb;
  _sb = createClientComponentClient<Database>();
  return _sb;
}

