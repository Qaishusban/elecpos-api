import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";


export async function GET(){
const s = supabaseAdmin();
const tables = ['products','customers','suppliers','sales','sale_items','purchases','purchase_items','stock_moves','accounts','ledger_entries','cash_transactions'];
const dump: Record<string, any[]> = {};
for (const t of tables){
const { data, error } = await s.from(t).select('*');
if (error) return NextResponse.json({ error: `${t}: ${error.message}` }, { status: 500 });
dump[t] = data ?? [];
}
return NextResponse.json({ exportedAt: new Date().toISOString(), dump });
}
