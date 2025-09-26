'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/context/LangContext";
import {
  Menu, X, Store, Boxes, ShoppingCart, BookText, Shield, LogIn, Languages
} from "lucide-react";
import { Home /* ... */ } from "lucide-react";
export default function Navbar() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  // ترجمة بسيطة
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  // اضبط اتجاه الصفحة حسب اللغة
  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  // عناصر القائمة
  const links = useMemo(() => ([
    { href: "/",          label: t("الصفحة الرئيسية", "Home"),     icon: Home },
    { href: "/products",    label: t("الأصناف", "Products"),        icon: Boxes },
    { href: "/purchases",   label: t("المشتريات", "Purchases"),     icon: ShoppingCart },
    { href: "/pos",         label: t("نقطة البيع", "POS"),         icon: Store },
    { href: "/accounting",  label: t("القيود", "Accounting"),       icon: BookText },
    { href: "/admin",       label: t("ادارة", "Admin"),             icon: Shield },
    { href: "/login",       label: t("تسجيل الدخول", "Login"),      icon: LogIn },
  // يمكنك إخفاء /login بعد تسجيل الدخول لو عندك session
  ]), [lang]);

  function NavLink({
    href, label, icon: Icon,
  }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={[
          "group inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "transition-all border",
          active
            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
            : "bg-white/70 text-slate-700 border-slate-200 hover:bg-white hover:shadow",
        ].join(" ")}
        onClick={() => setOpen(false)}
      >
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40">
      {/* شريط شفاف مع بلور */}
      <div className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
        <nav className="container mx-auto max-w-7xl h-16 px-4 flex items-center justify-between">
          {/* الشعار */}
          <Link
            href="/"
            className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600"
          >
            ElecPOS
          </Link>

          {/* دِسكتوب */}
          <div className="hidden md:flex items-center gap-2">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} icon={l.icon} />
            ))}

            {/* زر اللغة */}
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:shadow transition"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              aria-label="toggle-lang"
              title="Toggle Language"
            >
              <Languages className="h-4 w-4" />
              <span className="text-sm font-medium">{lang === "ar" ? "EN" : "AR"}</span>
            </button>
          </div>

          {/* موبايل: زر المينيو + لغة */}
          <div className="md:hidden flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:shadow transition"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              aria-label="toggle-lang"
              title="Toggle Language"
            >
              <Languages className="h-5 w-5" />
              <span className="text-sm font-medium">{lang === "ar" ? "EN" : "AR"}</span>
            </button>

            <button
              className="inline-flex items-center justify-center rounded-full p-2 border border-slate-200 bg-white hover:shadow transition"
              onClick={() => setOpen((v) => !v)}
              aria-label="open-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* طبقة منيو الموبايل */}
      {open && (
        <div className="md:hidden bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="container mx-auto max-w-7xl px-4 py-3 flex flex-wrap gap-2">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} icon={l.icon} />
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
