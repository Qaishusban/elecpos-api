// src/lib/roles.ts
import { getServerSupabase } from "./supabase-server";

export type Role = 'admin' | 'manager' | 'cashier' | 'viewer';
type Gate =
  | { ok: true }
  | { ok: false; reason: 'no-auth' | 'db' | 'forbidden' };

export async function requireRole(...allowed: Role[]): Promise<Gate> {
  const supabase = getServerSupabase();

  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr || !user) return { ok: false, reason: 'no-auth' };

  const { data, error } = await supabase
    .from('user_roles')
    .select('role_code')
    .eq('user_id', user.id);

  if (error) return { ok: false, reason: 'db' };

  const roles = new Set((data ?? []).map(r => r.role_code as Role));
  const allowedOk = allowed.some(r => roles.has(r));

  return allowedOk ? { ok: true } : { ok: false, reason: 'forbidden' };
}
