"use client";

import Link from "next/link";
import {
  DatabaseBackup, Shield, Users, Package, ShoppingCart,
  Calculator, RefreshCcw, ReceiptText, Boxes, FileText, LayoutDashboard
} from "lucide-react";
import { useEffect, useState } from "react";

const T = {
  ar: {
    title: "لوحة تحكم الأدمن",
    welcome: "مرحباً بك في صفحة الأدمن 👋",
    backup: "نسخة احتياطية",
    accounts: "إدارة الحسابات",
    users: "إدارة المستخدمين",
    products: "المنتجات",
    purchases: "فواتير المشتريات",
    pos: "نقطة البيع (POS)",
    accounting: "المحاسبة",
    movement: "حركة مادة",
    salesInv: "فواتير بيع",
    inventory: "جرد مواد",
    purchaseInv: "فواتير شراء",
  },
  en: {
    title: "Admin Dashboard",
    welcome: "Welcome to Admin Page 👋",
    backup: "Backup",
    accounts: "Accounts",
    users: "Users",
    products: "Products",
    purchases: "Purchase Invoices",
    pos: "POS",
    accounting: "Accounting",
    movement: "Item Movement",
    salesInv: "Sales Invoices",
    inventory: "Inventory",
    purchaseInv: "Purchase Invoices",
  },
};

function Card({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group surface inline-flex items-center gap-3 p-4 rounded-2xl border bg-white hover:shadow transition"
    >
      <span className="p-2 rounded-xl bg-slate-100 group-hover:bg-slate-200">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function AdminPage() {
  const [lang, setLang] = useState<"ar"|"en">("ar");
  useEffect(() => {
    const v = document.cookie.split("; ").find((x)=>x.startsWith("lang="))?.split("=")[1];
    if (v === "en") setLang("en");
  }, []);
  const L = T[lang];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-6 h-6" />
        <h1 className="text-2xl font-bold">{L.title}</h1>
      </div>
      <p className="text-gray-600">{L.welcome}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card href="/admin/backup" icon={<DatabaseBackup className="w-5 h-5" />} label={L.backup} />
        <Card href="/admin/accounts" icon={<Shield className="w-5 h-5" />} label={L.accounts} />
        <Card href="/admin/users" icon={<Users className="w-5 h-5" />} label={L.users} />
        <Card href="/products" icon={<Package className="w-5 h-5" />} label={L.products} />
        <Card href="/purchases" icon={<ShoppingCart className="w-5 h-5" />} label={L.purchases} />
        <Card href="/pos" icon={<Calculator className="w-5 h-5" />} label={L.pos} />
        <Card href="/accounting" icon={<Shield className="w-5 h-5" />} label={L.accounting} />
        {/* التقارير */}
        <Card href="/admin/movement" icon={<RefreshCcw className="w-5 h-5" />} label={L.movement} />
        <Card href="/admin/sales-invoices" icon={<ReceiptText className="w-5 h-5" />} label={L.salesInv} />
        <Card href="/admin/inventory" icon={<Boxes className="w-5 h-5" />} label={L.inventory} />
        <Card href="/admin/purchase-invoices" icon={<FileText className="w-5 h-5" />} label={L.purchaseInv} />
      </div>
    </div>
  );
}
