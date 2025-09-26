import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { event, session } = await req.json().catch(() => ({}));

  // نحدّث الكوكيز حسب حالة الدخول/الخروج أو تحديث التوكن
  if (event && session) {
    await supabase.auth.setSession(session);
  }
  return NextResponse.json({ ok: true });
}
