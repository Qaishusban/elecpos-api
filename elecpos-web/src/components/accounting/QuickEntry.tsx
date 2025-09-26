"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/context/LangContext";

type Account = {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  type?: string | null;
};

function cls(...x: (string | false | null | undefined)[]) {
  return x.filter(Boolean).join(" ");
}

export default function QuickEntry() {
  const sb = supabaseBrowser();
  const router = useRouter();
  const { lang } = useLang();

  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const dir = lang === "ar" ? "rtl" : "ltr";

  // حسابات + حالة تحميل
  const [loading, setLoading] = useState(true);
  const [accs, setAccs] = useState<Account[]>([]);

  // حقول النموذج
  const [vDate, setVDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [voucherNo, setVoucherNo] = useState<string>("");
  const [vDesc, setVDesc] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [debitAcc, setDebitAcc] = useState<number | null>(null);
  const [creditAcc, setCreditAcc] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);

  // تحميل الحسابات
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await sb
        .from("accounts")
        .select("id, code, name_ar, name_en, type")
        .order("code");

      if (!alive) return;
      if (error) {
        alert(error.message);
        setAccs([]);
      } else {
        setAccs(data ?? []);
        // افتراضياً: أول حساب للمدين والأول للداين
        setDebitAcc((data?.[0]?.id as number) ?? null);
        setCreditAcc((data?.[1]?.id as number) ?? null);
      }
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = !loading && accs.length > 0;

  const options = useMemo(
    () =>
      accs.map((a) => ({
        id: a.id,
        text: `${a.code} — ${lang === "ar" ? a.name_ar : a.name_en}`,
      })),
    [accs, lang]
  );

  async function handleSave() {
    try {
      if (!ready) return;
      if (!debitAcc || !creditAcc) {
        alert(t("اختر حسابات صحيحة.", "Pick valid accounts."));
        return;
      }
      if (!amount || amount <= 0) {
        alert(t("المبلغ غير صالح.", "Amount is invalid."));
        return;
      }

      setSaving(true);

      const { error } = await sb.rpc("post_journal_quick", {
  p_date: vDate,
  p_voucher_no: voucherNo || null,
  p_description: vDesc || null,
  p_debit_account_id: Number(debitAccountcode),   // هذا يجب أن يكون accounts.id
  p_credit_account_id: Number(creditAccountId), // وليس code
  p_amount: Number(amount),
});



      if (error) {
        alert("Add failed: " + error.message);
        return;
      }

      alert(t("تم الحفظ ✅", "Saved ✅"));

      // إعادة تهيئة بسيطة + تحديث السيرفر كومبوننتس
      setVoucherNo("");
      setVDesc("");
      setAmount(0);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={cls(
        "rounded-2xl border bg-white/70 backdrop-blur p-4",
        "supports-[backdrop-filter]:bg-white/60"
      )}
      dir={dir}
    >
      <h2 className="text-lg font-semibold mb-3">
        {t("إضافة قيد سريع", "Quick Entry")}
      </h2>

      {!ready ? (
        <div className="text-slate-500">{t("جاري التحميل…", "Loading…")}</div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-3">
          {/* التاريخ */}
          <label className="lg:col-span-2 flex flex-col text-sm">
            <span className="mb-1">{t("التاريخ", "Date")}</span>
            <input
              type="date"
              className="rounded-xl border px-3 py-2"
              value={vDate}
              onChange={(e) => setVDate(e.target.value)}
            />
          </label>

          {/* رقم المستند */}
          <label className="lg:col-span-2 flex flex-col text-sm">
            <span className="mb-1">{t("رقم المستند", "Voucher")}</span>
            <input
              className="rounded-xl border px-3 py-2"
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              placeholder={t("اختياري", "Optional")}
            />
          </label>

          {/* الوصف */}
          <label className="lg:col-span-4 flex flex-col text-sm">
            <span className="mb-1">{t("الوصف", "Description")}</span>
            <input
              className="rounded-xl border px-3 py-2"
              value={vDesc}
              onChange={(e) => setVDesc(e.target.value)}
              placeholder={t("سبب العملية…", "Reason…")}
            />
          </label>

          {/* المبلغ */}
          <label className="lg:col-span-2 flex flex-col text-sm">
            <span className="mb-1">{t("المبلغ", "Amount")}</span>
            <input
              type="number"
              className="rounded-xl border px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>

          {/* مدين */}
          <label className="lg:col-span-3 flex flex-col text-sm">
            <span className="mb-1">{t("المدين", "Debit")}</span>
            <select
              className="rounded-xl border px-3 py-2"
              value={debitAcc ?? ""}
              onChange={(e) => setDebitAcc(Number(e.target.value))}
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.text}
                </option>
              ))}
            </select>
          </label>

          {/* دائن */}
          <label className="lg:col-span-3 flex flex-col text-sm">
            <span className="mb-1">{t("الدائن", "Credit")}</span>
            <select
              className="rounded-xl border px-3 py-2"
              value={creditAcc ?? ""}
              onChange={(e) => setCreditAcc(Number(e.target.value))}
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.text}
                </option>
              ))}
            </select>
          </label>

          {/* أزرار */}
          <div className="lg:col-span-6 flex items-end gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !ready}
              className={cls(
                "px-5 py-2 rounded-2xl",
                "bg-slate-900 text-white hover:bg-slate-800",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {saving ? t("جارِ الحفظ…", "Saving…") : t("حفظ", "Save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setVoucherNo("");
                setVDesc("");
                setAmount(0);
              }}
              className="px-5 py-2 rounded-2xl border"
            >
              {t("إلغاء", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
