// src/components/JournalClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/context/LangContext"; // إن كان موجود

type JournalRow = {
  date: string;
  voucher_no: string;
  description: string;
  account_code: string;
  account_name_ar?: string;
  account_name_en?: string;
  debit: number;
  credit: number;
};

type TrialRow = {
  account_code: string;
  account_name_ar?: string;
  account_name_en?: string;
  debit: number;
  credit: number;
};

type AccountOpt = { id: number; code: string; name_ar: string; name_en: string };

export default function JournalClient({
  lang: langFromServer = "ar",
  from, to, journalRows, trialBalance, accounts
}: {
  lang?: "ar" | "en";
  from: string;
  to: string;
  journalRows: JournalRow[];
  trialBalance: TrialRow[];
  accounts: AccountOpt[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // لو عندك LangContext بنستخدمه، وإلا نستعمل langFromServer
  const ctx = (() => {
    try {
      return useLang?.();
    } catch { return undefined; }
  })() as { lang: "ar" | "en" } | undefined;

  const lang = (ctx?.lang ?? langFromServer) as "ar" | "en";

  // نصوص واجهة حسب اللغة
  const T = {
    from: lang === "ar" ? "من" : "From",
    to: lang === "ar" ? "إلى" : "To",
    apply: lang === "ar" ? "تطبيق" : "Apply",
    quick: lang === "ar" ? "قيد سريع" : "Quick Entry",
    date: lang === "ar" ? "التاريخ" : "Date",
    vno: lang === "ar" ? "رقم المستند" : "Voucher",
    desc: lang === "ar" ? "الوصف" : "Description",
    debit: lang === "ar" ? "مدين" : "Debit",
    credit: lang === "ar" ? "دائن" : "Credit",
    account: lang === "ar" ? "الحساب" : "Account",
    journal: lang === "ar" ? "القيود" : "Journal",
    tb: lang === "ar" ? "ميزان المراجعة" : "Trial Balance",
    total: lang === "ar" ? "الإجمالي" : "Total",
    save: lang === "ar" ? "حفظ" : "Save",
    cancel: lang === "ar" ? "إلغاء" : "Cancel",
    amount: lang === "ar" ? "المبلغ" : "Amount",
    noData: lang === "ar" ? "لا توجد بيانات." : "No data.",
  };

  // ========= فلترة =========
  const [fFrom, setFrom] = useState(from);
  const [fTo, setTo] = useState(to);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    sp.set("from", fFrom);
    sp.set("to", fTo);
    router.replace(`/accounting?${sp.toString()}`);
  }

  // ========= إضافة قيد سريع =========
  const [openAdd, setOpenAdd] = useState(false);
  const [vDate, setVDate] = useState(from);
  const [voucherNo, setVoucherNo] = useState("");
  const [vDesc, setVDesc] = useState("");

  const [debitAcc, setDebitAcc] = useState<number | null>(null);
  const [creditAcc, setCreditAcc] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!debitAcc || !creditAcc || amount <= 0) {
      alert(lang === "ar" ? "املأ الحقول: مدين، دائن، المبلغ" : "Fill: debit, credit, amount");
      return;
    }
    const sb = supabaseBrowser();
    const { error } = await sb.rpc("post_journal_quick", {
      p_date: vDate,
      p_voucher_no: voucherNo || null,
      p_description: vDesc || null,
      p_debit_account_id: debitAcc,
      p_credit_account_id: creditAcc,
      p_amount: amount,
    });
    if (error) alert((lang === "ar" ? "فشل إضافة القيد: " : "Add failed: ") + error.message);
    else { setOpenAdd(false); router.refresh(); }
  }

  // اسم الحساب حسب اللغة
  const acctName = (ar?: string, en?: string) =>
    lang === "ar"
      ? (ar || en || "")
      : (en || ar || "");

  // ========= تجميع القيود =========
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { header: { date: string; voucher_no: string; description: string }, lines: any[], tDebit: number, tCredit: number }
    >();
    for (const r of journalRows) {
      const key = `${r.date}__${r.voucher_no || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          header: { date: r.date, voucher_no: r.voucher_no, description: r.description },
          lines: [],
          tDebit: 0,
          tCredit: 0,
        });
      }
      const bucket = map.get(key)!;
      bucket.lines.push({
        ...r,
        display_name: acctName(r.account_name_ar, r.account_name_en),
      });
      bucket.tDebit += Number(r.debit || 0);
      bucket.tCredit += Number(r.credit || 0);
    }
    return Array.from(map.values()).sort((a, b) => a.header.date.localeCompare(b.header.date));
  }, [journalRows, lang]);

  const sumDebit = trialBalance.reduce((s, r) => s + Number(r.debit || 0), 0);
  const sumCredit = trialBalance.reduce((s, r) => s + Number(r.credit || 0), 0);
  const diff = sumDebit - sumCredit;

  // ========= Export =========
  function exportJournalExcel() {
    const flat = journalRows.map((r) => ({
      [T.date]: r.date,
      [T.vno]: r.voucher_no,
      [T.desc]: r.description,
      [T.account]: `${r.account_code} - ${acctName(r.account_name_ar, r.account_name_en)}`,
      [T.debit]: r.debit || 0,
      [T.credit]: r.credit || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "journal");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    downloadBlob(buf, `journal_${from}_${to}.xlsx`);
  }
  function exportTBExcel() {
    const flat = trialBalance.map((r) => ({
      [T.account]: `${r.account_code} - ${acctName(r.account_name_ar, r.account_name_en)}`,
      [T.debit]: r.debit || 0,
      [T.credit]: r.credit || 0,
    }));
    flat.push({ [T.account]: T.total, [T.debit]: sumDebit, [T.credit]: sumCredit } as any);
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "trial_balance");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    downloadBlob(buf, `trial_balance_${from}_${to}.xlsx`);
  }
  function downloadBlob(buf: any, filename: string) {
    const blob = new Blob([buf], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function exportJournalPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`${T.journal} (${from} → ${to})`, 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [[T.date, T.vno, T.desc, T.account, T.debit, T.credit]],
      body: journalRows.map((r) => [
        r.date,
        r.voucher_no ?? "",
        r.description ?? "",
        `${r.account_code} - ${acctName(r.account_name_ar, r.account_name_en)}`,
        Number(r.debit || 0).toLocaleString(),
        Number(r.credit || 0).toLocaleString(),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [240, 240, 240] },
      columnStyles: { 4: { halign: "right" }, 5: { halign: "right" } },
    });
    doc.save(`journal_${from}_${to}.pdf`);
  }
  function exportTBPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${T.tb} (${from} → ${to})`, 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [[T.account, T.debit, T.credit]],
      body: [
        ...trialBalance.map((r) => [
          `${r.account_code} - ${acctName(r.account_name_ar, r.account_name_en)}`,
          Number(r.debit || 0).toLocaleString(),
          Number(r.credit || 0).toLocaleString(),
        ]),
        [T.total, Number(sumDebit).toLocaleString(), Number(sumCredit).toLocaleString()],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [240, 240, 240] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    doc.save(`trial_balance_${from}_${to}.pdf`);
  }

  return (
    <div className="space-y-6">
      {/* فلترة */}
      <form onSubmit={applyFilter} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white border rounded-2xl p-3">
        <label className="text-sm flex flex-col">
          <span>{T.from}</span>
          <input type="date" value={fFrom} onChange={(e) => setFrom(e.target.value)} className="input" />
        </label>
        <label className="text-sm flex flex-col">
          <span>{T.to}</span>
          <input type="date" value={fTo} onChange={(e) => setTo(e.target.value)} className="input" />
        </label>
        <div className="md:col-span-3 flex items-end gap-2">
          <button className="btn">{T.apply}</button>
          <button type="button" className="btn-subtle" onClick={() => setOpenAdd(true)}>
            + {T.quick}
          </button>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn-subtle" onClick={exportJournalExcel}>Journal Excel</button>
            <button type="button" className="btn-subtle" onClick={exportJournalPDF}>Journal PDF</button>
            <button type="button" className="btn-subtle" onClick={exportTBExcel}>TB Excel</button>
            <button type="button" className="btn-subtle" onClick={exportTBPDF}>TB PDF</button>
          </div>
        </div>
      </form>

      {/* قيد سريع */}
      {openAdd && (
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <h3 className="font-semibold">{T.quick}</h3>
          <form onSubmit={addEntry} className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <label className="text-sm flex flex-col">
              <span>{T.date}</span>
              <input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} className="input" />
            </label>
            <label className="text-sm flex flex-col">
              <span>{T.vno}</span>
              <input value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} className="input" />
            </label>
            <label className="text-sm flex flex-col md:col-span-2">
              <span>{T.desc}</span>
              <input value={vDesc} onChange={(e) => setVDesc(e.target.value)} className="input" />
            </label>
            <label className="text-sm flex flex-col">
              <span>{T.debit}</span>
              <select value={debitAcc ?? ""} onChange={(e) => setDebitAcc(Number(e.target.value) || null)} className="input">
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {acctName(a.name_ar, a.name_en)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm flex flex-col">
              <span>{T.credit}</span>
              <select value={creditAcc ?? ""} onChange={(e) => setCreditAcc(Number(e.target.value) || null)} className="input">
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {acctName(a.name_ar, a.name_en)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm flex flex-col">
              <span>{T.amount}</span>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="input" />
            </label>

            <div className="md:col-span-6 flex gap-2">
              <button className="btn">{T.save}</button>
              <button type="button" className="btn-subtle" onClick={() => setOpenAdd(false)}>{T.cancel}</button>
            </div>
          </form>
        </div>
      )}

      {/* جدول القيود */}
      <div className="rounded-2xl border bg-white p-3 overflow-auto">
        <h3 className="font-semibold mb-3">
          {T.journal} ({grouped.length})
        </h3>
        {grouped.length === 0 ? (
          <div className="text-slate-500 text-sm">{T.noData}</div>
        ) : (
          <div className="space-y-4">
            {grouped.map((g, i) => (
              <div key={i} className="rounded-xl border overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 flex flex-wrap gap-3 items-center">
                  <span className="font-medium">{g.header.date}</span>
                  <span className="text-slate-600">{T.vno}: {g.header.voucher_no || "—"}</span>
                  <span className="text-slate-600">{g.header.description || ""}</span>
                  <span className="ml-auto text-sm">
                    <b>{T.debit}:</b> {g.tDebit.toLocaleString()} — <b>{T.credit}:</b> {g.tCredit.toLocaleString()}
                  </span>
                </div>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">{T.account}</th>
                      <th className="px-3 py-2 text-right">{T.debit}</th>
                      <th className="px-3 py-2 text-right">{T.credit}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.lines.map((r: any, k: number) => (
                      <tr key={k} className="border-t">
                        <td className="px-3 py-2">{r.account_code} — {r.display_name}</td>
                        <td className="px-3 py-2 text-right">{Number(r.debit || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{Number(r.credit || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ميزان مراجعة */}
      <div className="rounded-2xl border bg-white p-3 overflow-auto">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h3 className="font-semibold">{T.tb}</h3>
          <span className="px-2 py-1 rounded-xl border bg-green-50 text-sm">
            {T.debit}: <b>{sumDebit.toLocaleString()}</b>
          </span>
          <span className="px-2 py-1 rounded-xl border bg-red-50 text-sm">
            {T.credit}: <b>{sumCredit.toLocaleString()}</b>
          </span>
          <span className={`px-2 py-1 rounded-xl border text-sm ${sumDebit === sumCredit ? "bg-slate-50" : "bg-amber-50"}`}>
            {lang === "ar" ? "الفرق" : "Diff"}: <b>{(sumDebit - sumCredit).toLocaleString()}</b>
          </span>
        </div>

        {trialBalance.length === 0 ? (
          <div className="text-slate-500 text-sm">{T.noData}</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">{T.account}</th>
                <th className="px-3 py-2 text-right">{T.debit}</th>
                <th className="px-3 py-2 text-right">{T.credit}</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{r.account_code} — {acctName(r.account_name_ar, r.account_name_en)}</td>
                  <td className="px-3 py-2 text-right">{Number(r.debit || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(r.credit || 0).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t bg-slate-50 font-semibold">
                <td className="px-3 py-2">{T.total}</td>
                <td className="px-3 py-2 text-right">{sumDebit.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{sumCredit.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
