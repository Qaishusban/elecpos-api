import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";


export async function GET(req: NextRequest) {
const s = supabaseAdmin();
const { searchParams } = new URL(req.url);
const from = searchParams.get('from');
const to = searchParams.get('to');
const { data, error } = await s.rpc('report_trial_balance', { p_from: from, p_to: to });
if (error) return NextResponse.json({ error: error.message }, { status: 500 });
return NextResponse.json({ rows: data ?? [] });
}