import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";


export async function POST(req: NextRequest){
const s = supabaseAdmin();
const body = await req.json();
const dump = body?.dump as Record<string, any[]>;
if (!dump) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
// upsert لكل جدول
for (const [table, rows] of Object.entries(dump)){
if (!Array.isArray(rows) || rows.length===0) continue;
const { error } = await s.from(table).upsert(rows, { onConflict: 'id' });
if (error) return NextResponse.json({ error: `${table}: ${error.message}` }, { status: 500 });
}
return NextResponse.json({ message: 'Import finished' });
}