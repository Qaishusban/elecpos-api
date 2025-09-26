"use client";

import { useState } from "react";
import { T } from "@/lib/i18n";               // هذا تمام
import { useLang } from "@/context/LangContext"; // لو الـ alias شغال

// ⚠️ استيراد الكمبوننتات من المسار الصحيح (نسبي من داخل app/reports/)
import InventoryReport  from "./components/reports/InventoryReport";
import MovementReport   from "./components/reports/MovementReport";
import SalesReport      from "./components/reports/SalesReport";
import PurchasesReport  from "./components/reports/PurchasesReport";
// زيد الباقي لاحقًا بنفس الطريقة:
// import LedgerReport     from "./components/reports/LedgerReport";
// import TrialBalanceReport from "./components/reports/TrialBalanceReport";
// import CashReport         from "./components/reports/CashReport";

type TabDef = {
  key: string;
  labelAr: string;
  labelEn: string;
  // ✅ خليه نوع React.ComponentType حتى TS يعرف أنه كمبوننت
  Comp: React.ComponentType<any>;
};

export default function ReportsPage() {
  const { lang } = useLang();
  const L = T[lang];

  const tabs: TabDef[] = [
    { key: "inventory", labelAr: L.inventory, labelEn: L.inventory, Comp: InventoryReport },
    { key: "movement",  labelAr: L.movement,  labelEn: L.movement,  Comp: MovementReport  },
    { key: "sales",     labelAr: L.sales,     labelEn: L.sales,     Comp: SalesReport     },
    { key: "purchases", labelAr: L.purchases, labelEn: L.purchases, Comp: PurchasesReport },
    // { key: "ledger",    labelAr: L.ledger,    labelEn: L.ledger,    Comp: LedgerReport },
    // { key: "trial",     labelAr: L.trialBalance, labelEn: L.trialBalance, Comp: TrialBalanceReport },
    // { key: "cash",      labelAr: L.cash,      labelEn: L.cash,      Comp: CashReport },
  ];

  const [tab, setTab] = useState<string>("inventory");

  // ✅ لو ما لقى التبويب، خذ أول واحد
  const active = tabs.find((t) => t.key === tab) ?? tabs[0];
  const ActiveComp = active?.Comp;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{L.reports}</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-2xl border ${tab === t.key ? "bg-gray-100 font-semibold" : ""}`}
          >
            {lang === "ar" ? t.labelAr : t.labelEn}
          </button>
        ))}
      </div>

      {/* ✅ key=tab لإجبار remount ومنع لخبطة hooks */}
      <div key={tab}>
        {ActiveComp ? <ActiveComp /> : null}
      </div>
    </div>
  );
}
