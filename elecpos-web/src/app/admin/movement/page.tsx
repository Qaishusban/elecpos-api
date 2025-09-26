// src/app/reports/item-movement/page.tsx
export const dynamic = "force-dynamic";
import { supabaseServer } from "@/lib/supabase";
import ItemMovementTable from "@/components/ItemMovementTable";
import Link from "next/link";

type Search = { from?: string; to?: string; sku?: string };

function norm(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export default async function ItemMovementPage({ searchParams }: { searchParams: Search }) {
  const from =
    norm(searchParams.from) ||
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const to = norm(searchParams.to) || new Date().toISOString().slice(0, 10);
  const sku = (searchParams.sku || "").trim() || null;

  const s = supabaseServer();
  const { data, error } = await s.rpc("report_movement", {
    p_from: from,
    p_to: to,
    p_sku: sku,
  });

  if (error) {
    return (
      <div className="p-4 rounded-xl border bg-red-50 text-red-700">
        API Error: {error.message}
      </div>
    );
  }

  const rows = (data as any[]) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">حركة مادة</h1>

      <form className="grid md:grid-cols-4 gap-3 bg-white border rounded-2xl p-3">
        <label className="flex flex-col text-sm">
          <span>من</span>
          <input type="date" name="from" defaultValue={from} className="border rounded p-2" />
        </label>
        <label className="flex flex-col text-sm">
          <span>إلى</span>
          <input type="date" name="to" defaultValue={to} className="border rounded p-2" />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span>SKU</span>
          <input name="sku" defaultValue={sku ?? ""} placeholder="SKU أو جزء من الاسم" className="border rounded p-2" />
        </label>
        <div className="md:col-span-4 flex items-center gap-3">
          <button className="px-4 py-2 border rounded-2xl">تطبيق</button>
          <Link href="/login" className="underline text-sm">تسجيل الدخول</Link>
        </div>
      </form>

      {/* جدول + أزرار التصدير (Client) */}
      <ItemMovementTable
        rows={rows}
        meta={{ from, to, sku: sku ?? "" }}
      />
    </div>
  );
}
