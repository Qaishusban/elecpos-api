import QuickEntry from "@/components/accounting/QuickEntry";

export const dynamic = "force-dynamic";

export default async function AccountingPage() {
  return (
    <div className="space-y-6">
      {/* تنبيه صغير عن الواجهات المؤقتة */}
      <div className="rounded-2xl border bg-amber-50 text-amber-900 p-4 leading-7">
        <b>تنبيه:</b> هذه الصفحة تعرض نموذج قيد سريع وتقارير مبسطة. بعد إضافة قيود
        من النموذج، سيتم تحديث القائمة والتقارير تلقائياً.
      </div>

      {/* أزرار تصدير / فلاتر التاريخ (تصميم فقط) */}
      <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 supports-[backdrop-filter]:bg-white/60">
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            className="rounded-xl border px-3 py-2"
            defaultValue={new Date(Date.now() - 30 * 24 * 3600 * 1000)
              .toISOString()
              .slice(0, 10)}
          />
          <input
            type="date"
            className="rounded-xl border px-3 py-2"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />

          <button className="px-4 py-2 rounded-2xl border">TB PDF</button>
          <button className="px-4 py-2 rounded-2xl border">TB Excel</button>
          <button className="px-4 py-2 rounded-2xl border">Journal PDF</button>
          <button className="px-4 py-2 rounded-2xl border">Journal Excel</button>
        </div>
      </div>

      {/* القيد السريع (عميل) */}
      <QuickEntry />

      {/* قوائم / تقارير (إمكانك لاحقاً عرض القيد/الميزان هنا) */}
      <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 supports-[backdrop-filter]:bg-white/60">
        <div className="text-slate-500">
          (هنا تعرض دفتر اليومية وميزان المراجعة بعد الربط بـ RPCs)
        </div>
      </div>
    </div>
  );
}
