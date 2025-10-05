'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';



/* نوع البيانات للسلاسل */
type Point = { date: string; total: number };

export default function Home() {
  const router = useRouter();
  const sb = supabaseBrowser();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [sales30, setSales30] = useState<Point[]>([]);
  const [purchases30, setPurchases30] = useState<Point[]>([]);
  const [kpi, setKpi] = useState({
    salesToday: 0,
    salesMonth: 0,
    purchasesMonth: 0,
    itemsCount: 0,
  });

  useEffect(() => {
    const init = async () => {
      // تحقق من الجلسة
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      setReady(true);

      try {
        setLoading(true);

        // الحدود الزمنية
        const todayISO = new Date().toISOString().slice(0, 10);
        const monthStart = new Date();
        monthStart.setDate(1);
        const monthStartISO = monthStart.toISOString();

        const thirtyAgo = new Date(Date.now() - 29 * 24 * 3600 * 1000);
        const thirtyStartISO = new Date(thirtyAgo.setHours(0,0,0,0)).toISOString();

        // ====== مبيعات (sales_invoices) ======
        // اجلب الفواتير خلال 30 يوم (created_at, grand_total)
        const sal30 = await sb
          .from('sales_invoices')
          .select('created_at, grand_total')
          .gte('created_at', thirtyStartISO)
          .order('created_at');

        const salesGrouped = groupByDate(sal30.data ?? []);
        setSales30(salesGrouped);

        //KPIs: اليوم والشهر
        const salM = await sb
          .from('sales_invoices')
          .select('created_at, grand_total')
          .gte('created_at', monthStartISO);

        const salesToday = sumByDate(salM.data ?? [], todayISO);
        const salesMonth = sumAll(salM.data ?? []);

        // ====== مشتريات (purchases) ======
        const pur30 = await sb
          .from('purchases')
          .select('created_at, grand_total')
          .gte('created_at', thirtyStartISO)
          .order('created_at');

        const purchasesGrouped = groupByDate(pur30.data ?? []);
        setPurchases30(purchasesGrouped);

        const purM = await sb
          .from('purchases')
          .select('created_at, grand_total')
          .gte('created_at', monthStartISO);

        const purchasesMonth = sumAll(purM.data ?? []);

        // ====== عدد الأصناف ======
        const items = await sb.from('products').select('id', { count: 'exact', head: true });

        setKpi({
          salesToday,
          salesMonth,
          purchasesMonth,
          itemsCount: items.count ?? 0,
        });
      } catch (_e) {
        // ما نوقف الصفحة لو جداول مش موجودة—نعرِض 0
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  return (
    <div className="space-y-6">
      {/* الهيدر */}
      <header className="flex items-center gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-1 ring-slate-200">
          {/* غيّر مسار الشعار عندك */}
          <Image src="/logo.svg" alt="ElecPOS" fill className="object-contain p-1.5" />
        </div>
        <div>
          <div className="text-2xl font-bold tracking-tight">مرحباً</div>
          <p className="text-slate-500 text-sm">نظرة عامة سريعة على المتجر</p>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="مبيعات اليوم" value={kpi.salesToday} suffix="JOD" loading={loading} />
        <KpiCard title="مبيعات الشهر" value={kpi.salesMonth} suffix="JOD" loading={loading} />
        <KpiCard title="مشتريات الشهر" value={kpi.purchasesMonth} suffix="JOD" loading={loading} />
        <KpiCard title="عدد الأصناف" value={kpi.itemsCount} loading={loading} />
      </section>

      {/* الرسوم البيانية */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="مبيعات آخر 30 يوم"
          series={sales30}
          color="#10b981"
          loading={loading}
          emptyLabel="لا توجد بيانات مبيعات"
        />
        <ChartCard
          title="مشتريات آخر 30 يوم"
          series={purchases30}
          color="#6366f1"
          loading={loading}
          emptyLabel="لا توجد بيانات مشتريات"
        />
      </section>
    </div>
  );
}

/* ----------------- مكونات مساعدة ----------------- */

function KpiCard({ title, value, suffix, loading }: { title: string; value: number; suffix?: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">
        {loading ? <span className="inline-block h-6 w-24 animate-pulse rounded bg-slate-100" /> : (
          <>
            {Number(value || 0).toLocaleString()} {suffix ? <span className="text-base text-slate-500">{suffix}</span> : null}
          </>
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  series,
  color,
  loading,
  emptyLabel,
}: {
  title: string;
  series: Point[];
  color: string;
  loading?: boolean;
  emptyLabel?: string;
}) {
  const totals = series.map(p => p.total);
  const max = totals.length ? Math.max(...totals) : 0;
  const min = 0;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        {!loading && (
          <div className="text-xs text-slate-500">
            المجموع: <b>{totals.reduce((a, b) => a + b, 0).toLocaleString()}</b>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : totals.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">{emptyLabel}</div>
      ) : (
        <MiniArea data={totals} color={color} min={min} max={max} />
      )}
    </div>
  );
}

/* رسم Area صغير بـ SVG بدون مكتبات */
function MiniArea({ data, color, min, max }: { data: number[]; color: string; min: number; max: number }) {
  const w = 640;           // عرض الرسم
  const h = 160;           // ارتفاع الرسم
  const pad = 8;

  const path = useMemo(() => {
    if (!data.length) return '';
    const n = data.length;
    const X = (i: number) => pad + (i / (n - 1)) * (w - 2 * pad);
    const Y = (v: number) => {
      const t = (v - min) / Math.max(1, max - min); // 0..1
      return h - pad - t * (h - 2 * pad);
    };
    let d = `M ${X(0)} ${Y(data[0])}`;
    for (let i = 1; i < n; i++) d += ` L ${X(i)} ${Y(data[i])}`;
    // اغلاق للمنطقة
    d += ` L ${pad + (w - 2 * pad)} ${h - pad} L ${pad} ${h - pad} Z`;
    return d;
  }, [data, min, max, w, h]);

  const line = useMemo(() => {
    if (!data.length) return '';
    const n = data.length;
    const X = (i: number) => pad + (i / (n - 1)) * (w - 2 * pad);
    const Y = (v: number) => {
      const t = (v - min) / Math.max(1, max - min);
      return h - pad - t * (h - 2 * pad);
    };
    let d = `M ${X(0)} ${Y(data[0])}`;
    for (let i = 1; i < n; i++) d += ` L ${X(i)} ${Y(data[i])}`;
    return d;
  }, [data, min, max, w, h]);

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-slate-50">
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-40">
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* محور سفلي خفيف */}
        <line x1="8" y1={h-8} x2={w-8} y2={h-8} stroke="#e5e7eb" />

        <path d={path} fill="url(#g)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" />
      </svg>
    </div>
  );
}

/* ----------------- أدوات تجميع بسيطة ----------------- */

function groupByDate(rows: any[]): Point[] {
  const map = new Map<string, number>();
  rows.forEach(r => {
    const d = new Date(r.created_at);
    const key = d.toISOString().slice(0, 10);
    const v = Number(r.grand_total || 0);
    map.set(key, (map.get(key) || 0) + v);
  });

  // نُخرِج آخر 30 يوم بالتسلسل حتى لو ما في قيم في بعض الأيام
  const out: Point[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, total: map.get(key) || 0 });
  }
  return out;
}

function sumAll(rows: any[]) {
  return rows.reduce((s, r) => s + Number(r.grand_total || 0), 0);
}

function sumByDate(rows: any[], ymd: string) {
  return rows.reduce((s, r) => {
    const d = new Date(r.created_at).toISOString().slice(0, 10);
    return s + (d === ymd ? Number(r.grand_total || 0) : 0);
  }, 0);
}
