export const dynamic = "force-dynamic";
import { supabaseServer } from "@/lib/supabase";
import InventoryReport from "@/components/InventoryReport";

function norm(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export default async function InventoryPage({ searchParams }: { searchParams: { asof?: string } }) {
  const asof =
    norm(searchParams.asof) ||
    new Date().toISOString().slice(0, 10);

  const s = supabaseServer();
  const { data, error } = await s.rpc("report_inventory", { p_as_of: asof });

  if (error) {
    return <div className="p-4 rounded-xl border bg-red-50 text-red-700">API Error: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تقرير الجرد</h1>

      <form className="grid md:grid-cols-4 gap-3 bg-white border rounded-2xl p-3">
        <label className="flex flex-col text-sm">
          <span>حتى تاريخ</span>
          <input type="date" name="asof" defaultValue={asof} className="border rounded p-2" />
        </label>
        <div className="md:col-span-4">
          <button className="px-4 py-2 border rounded-2xl">تطبيق</button>
        </div>
      </form>

      <InventoryReport rows={(data as any[]) ?? []} meta={{ asof }} />
    </div>
  );
}
