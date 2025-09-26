export const dynamic = "force-dynamic";
import { supabaseServer } from "../../../lib/supabase-server";
import PurchaseInvoicesReport from "../../../components/PurchaseInvoicesReport";

type Search = { from?: string; to?: string; details?: string };

function norm(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export default async function PurchaseInvoicesPage({ searchParams }: { searchParams: Search }) {
  const from =
    norm(searchParams.from) ||
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const to = norm(searchParams.to) || new Date().toISOString().slice(0, 10);
  const showDetails = (searchParams.details ?? "1") === "1";

  const s = supabaseServer();
  const { data, error } = await s.rpc("report_purchases", { p_from: from, p_to: to });
  if (error) {
    return <div className="p-4 rounded-xl border bg-red-50 text-red-700">API Error: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">فواتير الشراء</h1>

      <form className="grid md:grid-cols-5 gap-3 bg-white border rounded-2xl p-3">
        <label className="flex flex-col text-sm">
          <span>من</span>
          <input type="date" name="from" defaultValue={from} className="border rounded p-2" />
        </label>
        <label className="flex flex-col text-sm">
          <span>إلى</span>
          <input type="date" name="to" defaultValue={to} className="border rounded p-2" />
        </label>
        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" name="details" value="1" defaultChecked={showDetails} />
          <span>عرض التفاصيل (سطور الأصناف)</span>
        </label>
        <div className="md:col-span-5">
          <button className="px-4 py-2 border rounded-2xl">تطبيق</button>
        </div>
      </form>

      <PurchaseInvoicesReport
        rows={(data as any[]) ?? []}
        meta={{ from, to }}
        detailsDefault={showDetails}
      />
    </div>
  );
}
