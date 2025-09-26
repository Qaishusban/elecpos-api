import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  const { email, password, full_name, role } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name, role }
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // create profile row
  await supabase.from("user_profiles").insert({
    id: data.user!.id, full_name, role: role || "cashier"
  });

  return NextResponse.json({ ok: true, id: data.user!.id });
}
