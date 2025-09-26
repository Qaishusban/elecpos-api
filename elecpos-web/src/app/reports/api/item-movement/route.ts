import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase-server";


export async function GET(req: NextRequest) {
const s = supabaseServer();
const { searchParams } = new URL(req.url);
const from = searchParams.get('from');
const to = searchParams.get('to');
const sku = searchParams.get('sku');
const { data, error } = await s.rpc('report_movement', { p_from: from, p_to: to, p_sku: sku });
if (error) return NextResponse.json({ error: error.message }, { status: 500 });
return NextResponse.json({ rows: data ?? [] });
}